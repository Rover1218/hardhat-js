// Wait for ethers to load
function initializeApp() {
    if (typeof window.ethers === 'undefined') {
        setTimeout(initializeApp, 100);
        return;
    }

    const { BrowserProvider, Contract } = window.ethers;
    const contractAddress = "0xb0483D8863b7a8381D5998228d956Fc9262caa2D";
    const contractABI = [
        "function addTodo(string memory _text) public",
        "function getMyTodos() public view returns (string[] memory texts, bool[] memory completed)",
        "function toggleMyTodo(uint _index) public",
        "function getMyTodoCount() public view returns (uint)",
        "event TodoAdded(address indexed author, string text)",
        "event TodoToggled(address indexed author, uint256 indexed id, bool completed)"
    ];

    let contract = null;
    let signer = null;
    let addButton = null;  // Add this at the top with other state variables

    // Add auto-connection management
    const STORAGE_KEY = 'todolist_wallet_connected';

    async function checkStorageAndConnect() {
        // First check if MetaMask is installed
        if (!window.ethereum) {
            alert('Please install MetaMask to use this application');
            return;
        }

        const wasConnected = localStorage.getItem(STORAGE_KEY) === 'true';
        if (wasConnected) {
            const accounts = await window.ethereum.request({
                method: 'eth_accounts'
            });
            if (accounts.length > 0) {
                await connectWallet(true);
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        }
    }

    // Hide loading container initially
    document.querySelector('.loading-container').style.display = 'none';

    async function connectWallet(silent = false) {
        // Check if MetaMask is installed
        if (!window.ethereum) {
            alert('Please install MetaMask to use this application');
            return;
        }

        const loadingBtn = document.getElementById('connect-wallet');
        loadingBtn.textContent = 'Connecting...';
        loadingBtn.disabled = true;

        try {
            // Only prompt for connection if not silent mode
            let accounts;
            if (silent) {
                accounts = await window.ethereum.request({ method: 'eth_accounts' });
            } else {
                accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            }

            if (accounts.length === 0) {
                throw new Error('No accounts found');
            }

            // Create provider and signer
            const provider = new BrowserProvider(window.ethereum, "sepolia");
            signer = await provider.getSigner();
            const address = await signer.getAddress();

            // Store connection state
            localStorage.setItem(STORAGE_KEY, 'true');

            // Update UI
            document.getElementById('wallet-address').textContent = `Connected: ${address.slice(0, 6)}...${address.slice(-4)}`;

            // Initialize contract
            contract = new Contract(
                contractAddress,
                contractABI,
                signer
            );

            document.getElementById('todo-form').style.display = 'flex';
            loadingBtn.style.display = 'none';

            // Load existing todos
            await loadTodos();

        } catch (error) {
            console.error('Error:', error);
            localStorage.removeItem(STORAGE_KEY);
            if (!silent) {
                alert(error.message || 'Failed to connect wallet');
            }
        } finally {
            loadingBtn.disabled = false;
            loadingBtn.textContent = 'Connect Wallet';
        }
    }

    async function addTodo(text) {
        if (!contract) return;
        if (!addButton) {
            addButton = document.querySelector('#todo-form button[type="submit"]');
        }

        const loading = document.querySelector('.loading-container');

        try {
            addButton.disabled = true;
            addButton.textContent = 'Adding...';
            addButton.classList.add('disabled');
            // Only show loading when actually processing a transaction
            if (contract && signer) {
                loading.style.display = 'flex';
            }

            const tx = await contract.addTodo(text);
            await tx.wait();
            await loadTodos();
        } catch (error) {
            console.error('Error adding todo:', error);
            alert('Error adding todo: ' + error.message);
        } finally {
            loading.style.display = 'none';
            addButton.disabled = false;
            addButton.textContent = 'Add Task';
            addButton.classList.remove('disabled');
        }
    }

    async function loadTodos() {
        if (!contract) return;
        try {
            const [texts, completed] = await contract.getMyTodos();
            const todoList = document.getElementById('todo-list');
            todoList.innerHTML = `
                <div class="todo-sections">
                    <div class="active-todos">
                        <h2>Active Tasks</h2>
                        <ul id="active-list"></ul>
                    </div>
                    <div class="completed-todos">
                        <h2>Completed Tasks</h2>
                        <ul id="completed-list"></ul>
                    </div>
                </div>
            `;

            const activeList = document.getElementById('active-list');
            const completedList = document.getElementById('completed-list');

            // Get completion timestamps from localStorage
            const completionTimes = JSON.parse(localStorage.getItem('todo_completion_times') || '{}');
            const currentTime = Date.now();
            const oneDayInMs = 24 * 60 * 60 * 1000;

            texts.forEach((todo, index) => {
                // Skip completed todos older than 24 hours
                if (completed[index]) {
                    const completionTime = completionTimes[index] || currentTime;
                    if (currentTime - completionTime > oneDayInMs) {
                        return; // Skip this todo
                    }
                }

                const li = document.createElement('li');
                li.className = 'todo-item';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = completed[index];
                checkbox.addEventListener('change', () => toggleTodo(index));

                const span = document.createElement('span');
                span.textContent = todo;
                if (completed[index]) {
                    span.classList.add('completed');
                }

                const date = document.createElement('small');
                if (completed[index]) {
                    const completionTime = new Date(completionTimes[index]);
                    date.textContent = completionTime.toLocaleString();
                } else {
                    date.textContent = new Date().toLocaleDateString();
                }
                date.className = 'todo-date';

                li.appendChild(checkbox);
                li.appendChild(span);
                li.appendChild(date);

                li.style.animationDelay = `${index * 0.1}s`;

                if (completed[index]) {
                    completedList.appendChild(li);
                } else {
                    activeList.appendChild(li);
                }
            });
        } catch (error) {
            console.error('Error loading todos:', error);
        }
    }

    async function toggleTodo(index) {
        if (!contract) return;
        try {
            const tx = await contract.toggleMyTodo(index);
            await tx.wait();

            // Update completion timestamp
            const completionTimes = JSON.parse(localStorage.getItem('todo_completion_times') || '{}');
            completionTimes[index] = Date.now();
            localStorage.setItem('todo_completion_times', JSON.stringify(completionTimes));

            await loadTodos();
        } catch (error) {
            console.error('Error toggling todo:', error);
            alert('Error toggling todo: ' + error.message);
        }
    }

    // Add network check
    async function checkNetwork() {
        try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (chainId !== '0xaa36a7') {
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0xaa36a7' }], // Sepolia
                    });
                } catch (switchError) {
                    // Handle chain not added to MetaMask
                    if (switchError.code === 4902) {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0xaa36a7',
                                chainName: 'Sepolia Test Network',
                                nativeCurrency: {
                                    name: 'ETH',
                                    symbol: 'ETH',
                                    decimals: 18
                                },
                                rpcUrls: ['https://sepolia.infura.io/v3/'],
                                blockExplorerUrls: ['https://sepolia.etherscan.io']
                            }]
                        });
                    }
                }
            }
            return true;
        } catch (error) {
            console.error('Error checking network:', error);
            return false;
        }
    }

    // Update wallet event handlers to handle changes without page reload
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', async (accounts) => {
            if (accounts.length === 0) {
                // Handle disconnect
                localStorage.removeItem(STORAGE_KEY);
                document.getElementById('wallet-address').textContent = '';
                document.getElementById('todo-form').style.display = 'none';
                document.getElementById('connect-wallet').style.display = 'block';
                contract = null;
                signer = null;
            } else {
                // Reconnect with new account
                await connectWallet(true);
            }
        });

        window.ethereum.on('chainChanged', async (chainId) => {
            if (chainId !== '0xaa36a7') { // Sepolia chainId
                document.getElementById('todo-form').style.display = 'none';
                document.getElementById('todo-list').innerHTML = '';
                alert('Please switch to Sepolia network');
            } else {
                await connectWallet();
            }
        });
    }

    // Update connect button event listener
    document.getElementById('connect-wallet').addEventListener('click', async () => {
        if (!window.ethereum) {
            alert('Please install MetaMask to use this application');
            return;
        }
        await checkNetwork();
        await connectWallet(false); // Explicitly set silent to false for button click
    });

    document.getElementById('todo-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('todo-input');
        if (input.value.trim()) {
            await addTodo(input.value.trim());
            input.value = '';
        }
    });

    // Initialize connection on load
    checkStorageAndConnect();
}

// Start initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);