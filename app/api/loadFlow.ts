import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../db';

export default async function loadFlow(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME);
    const collection = db.collection('flows');

    const flows = await collection.find({}).toArray();

    res.status(200).json(flows);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}
