import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../db';

export default async function saveFlow(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const { nodes, edges } = req.body;

  if (!nodes || !edges) {
    res.status(400).json({ message: 'Invalid data' });
    return;
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME);
    const collection = db.collection('flows');

    const result = await collection.insertOne({ nodes, edges });

    res.status(200).json({ message: 'Flow saved', id: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}
