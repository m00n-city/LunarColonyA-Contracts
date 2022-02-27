// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @dev A simple mock ProxyRegistry for use in local tests
 */
contract ProxyRegistryMock {
    mapping(address => address) public proxies;

    function setProxyForOwner(address owner, address proxy) external {
        proxies[owner] = proxy;
    }
}
