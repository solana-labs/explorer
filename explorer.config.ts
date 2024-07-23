const explorer = {
    clusters: [
        {
            cluster: 'mainnet',
            name: 'Mainnet Beta',
            uri: 'https://explorer-api.mainnet-beta.solana.com',
        },
        {
            cluster: 'testnet',
            name: 'Testnet',
            uri: 'https://explorer-api.testnet.solana.com',
        },
        {
            cluster: 'devnet',
            name: 'Devnet',
            uri: 'https://explorer-api.testnet.solana.com',
        },
    ],
    features: {
        addCluster: true,
        pingStats: true,
    },
    metadata: {
        description: 'Explorer is a simple file explorer',
        title: 'Explorer',
    },
};

export default explorer;
