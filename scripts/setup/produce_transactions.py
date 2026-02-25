import time
import json
import random
import os
from kafka import KafkaProducer
from dotenv import load_dotenv

load_dotenv()

# Kafka configuration
BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
TOPIC_NAME = "transactions"

def generate_transaction():
    """Generate a random transaction."""
    categories = ["Food", "Transport", "Entertainment", "Utilities", "Shopping"]
    merchants = ["Uber", "Netflix", "Amazon", "Starbucks", "Walmart", "Target"]
    
    return {
        "transaction_id": f"txn_{random.randint(10000, 99999)}",
        "userId": "user_123",
        "amount": round(random.uniform(5.0, 500.0), 2),
        "currency": "USD",
        "merchant": random.choice(merchants),
        "category": random.choice(categories),
        "timestamp": time.time(),
        "status": "completed"
    }

def produce_transactions():
    print(f"Connecting to Kafka at {BOOTSTRAP_SERVERS}...")
    try:
        producer = KafkaProducer(
            bootstrap_servers=BOOTSTRAP_SERVERS,
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )
        print(f"Connected. producing to topic '{TOPIC_NAME}'...")
        
        while True:
            txn = generate_transaction()
            producer.send(TOPIC_NAME, txn)
            print(f"Sent: {txn}")
            time.sleep(2)  # Send every 2 seconds
            
    except Exception as e:
        print(f"Error producing messages: {e}")
        print("Ensure Kafka is running (docker-compose up -d kafka).")

if __name__ == "__main__":
    produce_transactions()
