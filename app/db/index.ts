import { MongoClient } from 'mongodb';

const uri = 'mongodb://localhost:27017';
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

let client;
let clientPromise;

if (!process.env.DB_HOST) {
  throw new Error('Please add your Mongo URI to .env.local');
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

clientPromise.then(() => {
  console.log('Connected to MongoDB successfully');
}).catch((err) => {
  console.error('Failed to connect to MongoDB', err);
});

export default clientPromise;
