//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;



contract SPR20 {


    event Approval(
        address indexed _owner,
        address indexed _spender,
        uint _value);

    event Transfer(
        address indexed _from,
        address indexed _to,
        uint _value);


    mapping(address => mapping (address => uint)) private allowed;
    mapping(address => uint) private balances;


    uint private contractTotalSupply = 1000000000;
    string private contractName = "Spritzen"; 
    string private contractSymbol = "SPR";
    uint8 private contractDecimals = 18;
    address private contractOwner;



    constructor() 
    {
        contractOwner = msg.sender;
    }


 
    modifier onlyOwner() {
        require(
            msg.sender == contractOwner,
            "Only owner can do this");
        _;
    }



    modifier ifAddressIsNotZero(
        address _account) 
    {
        require(
            _account != address(0),
            "Zero address are not allowed");
        _;
    }



    modifier ifBalanceGreatherThanOrEqualToAmount(
        uint _balance,
        uint _amount) 
    {
        require(
            _balance >= _amount,
            "Not enough tokens");
        _;
    }


    modifier ifAllowedGreatherThanOrEqualToAmount(
        uint _allowed,
        uint _amount)
    {
        require(
            _allowed >= _amount,
            "Allowed limit exceeded");
        _;
    }



    function name() 
     public 
     view 
     returns (string memory) {
         return contractName;
    }



    function symbol() 
     public view 
     returns (string memory) 
    {
         return contractSymbol;
    }



    function decimals() 
     public 
     view
     returns (uint8) 
    {
        return contractDecimals;
    }



    function totalSupply() 
     public 
     view 
     returns (uint) 
    {
        return contractTotalSupply; 
    }


 
    function balanceOf(
        address _owner)
        public 
        view
        ifAddressIsNotZero(_owner) 
        returns (uint balance)
    {
        balance = balances[_owner];
    }


 
    function transfer(
        address _to,
        uint _value)
        public
        ifAddressIsNotZero(_to)
        ifBalanceGreatherThanOrEqualToAmount(balances[msg.sender], _value)
        returns (bool success) 
    {

        unchecked {
            balances[msg.sender] -=  _value;
            balances[_to] += _value;
        }

        emit Transfer(msg.sender, _to, _value);
        success = true;
    }



    function transferFrom(
        address _from,
        address _to,
        uint _value) 
        public 
        ifAddressIsNotZero(_from)
        ifAddressIsNotZero(_to)
        ifAllowedGreatherThanOrEqualToAmount(allowance(_from, msg.sender), _value)
        ifBalanceGreatherThanOrEqualToAmount(balances[_from], _value)
        returns (bool success) 
    {

        allowed[_from][msg.sender] -= _value;
        emit Approval(_from, msg.sender, allowed[_from][msg.sender]);
        
        balances[_from] -= _value;
        balances[_to] += _value;

        emit Transfer(_from, _to, _value);
        success = true;
    }



    function approve(
        address _spender,
        uint _value)
        public
        ifAddressIsNotZero(_spender)
        ifBalanceGreatherThanOrEqualToAmount(balances[msg.sender], _value)
        returns (bool success)
    {
        allowed[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        success = true;
    }



    function allowance(
        address _owner,
        address _spender)
        public 
        view
        ifAddressIsNotZero(_owner)
        ifAddressIsNotZero(_spender)
        returns (uint remaining) 
    {
        remaining = allowed[_owner][_spender];
    }



    function burn(
        address _account,
        uint _amount) 
        public
        onlyOwner
        ifAddressIsNotZero(_account)
        ifBalanceGreatherThanOrEqualToAmount(balances[_account], _amount)
    {
        unchecked {
            balances[_account] -= _amount;
            contractTotalSupply -= _amount;    
        }

        emit Transfer(_account, address(0), _amount);
    }



    function mint(
        address _account,
        uint _amount)
        public  
        onlyOwner 
        ifAddressIsNotZero(_account)
    {
        unchecked {
            balances[_account] += _amount;
            contractTotalSupply += _amount;
        }
        
        emit Transfer(address(0), _account, _amount);
    }

}