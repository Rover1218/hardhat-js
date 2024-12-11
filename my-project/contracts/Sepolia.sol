// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Sepolia {
    struct Todo {
        string text;
        bool completed;
    }
    
    // Map address to their todos
    mapping(address => Todo[]) private userTodos;
    
    event TodoAdded(address indexed author, string text);
    event TodoToggled(address indexed author, uint256 indexed id, bool completed);
    
    function addTodo(string memory _text) public {
        userTodos[msg.sender].push(Todo({
            text: _text,
            completed: false
        }));
        emit TodoAdded(msg.sender, _text);
    }
    
    function getMyTodos() public view returns (string[] memory texts, bool[] memory completed) {
        Todo[] storage myTodos = userTodos[msg.sender];
        uint length = myTodos.length;
        texts = new string[](length);
        completed = new bool[](length);
        
        // Reverse the order when returning todos
        for(uint i = 0; i < length; i++) {
            texts[i] = myTodos[length - 1 - i].text;
            completed[i] = myTodos[length - 1 - i].completed;
        }
        return (texts, completed);
    }
    
    function toggleMyTodo(uint _index) public {
        require(_index < userTodos[msg.sender].length, "Todo does not exist");
        userTodos[msg.sender][_index].completed = !userTodos[msg.sender][_index].completed;
        emit TodoToggled(msg.sender, _index, userTodos[msg.sender][_index].completed);
    }
    
    function getMyTodoCount() public view returns (uint) {
        return userTodos[msg.sender].length;
    }
}