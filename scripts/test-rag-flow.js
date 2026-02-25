const axios = require('axios');

async function testFlow() {
    console.log('--- 🚀 Starting RAG-Driven Finance Assistant Test ---');

    const transaction = {
        amount: 85.20,
        merchant: 'Organic Market Express',
        category: 'Grocery'
    };

    try {
        // 1. Send Transaction
        console.log('1. Sending test transaction to Transaction Service...');
        const txResponse = await axios.post('http://localhost:3004/api/transactions', transaction);
        console.log('✅ Transaction Sent:', txResponse.data.data.transaction_id);

        console.log('Waiting 5 seconds for Pathway to index the stream...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 2. Query Knowledge Base
        console.log('2. Querying AI Assistant about the transaction...');
        const chatResponse = await axios.post('http://localhost:5000/api/chat/message', {
            message: "Did I spend any money at Organic Market Express lately?"
        });

        console.log('\n--- 🧠 AI RESPONSE ---');
        console.log(chatResponse.data.answer);
        console.log('----------------------\n');

        if (chatResponse.data.answer.toLowerCase().includes('organic market')) {
            console.log('🎉 SUCCESS: The AI successfully retrieved the transaction from the Pathway stream!');
        } else {
            console.log('⚠️ NOTE: The AI didn\'t explicitly mention the transaction. This might be due to Pathway indexing latency or prompt context filtering.');
        }

    } catch (error) {
        console.error('❌ TEST FAILED:', error.message);
        console.log('\nHint: Make sure all services are running with "docker-compose up" before running this test.');
    }
}

testFlow();
