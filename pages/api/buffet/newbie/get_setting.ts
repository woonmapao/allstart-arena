import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/db/db';


export default async function handle(req: NextApiRequest, res: NextApiResponse) {
    const connection = await pool.getConnection()
    try {
        const query = 'SELECT * FROM buffet_setting_newbie ORDER BY isStudent ASC';

        // Execute the SQL query to fetch time slots
        const [results] = await connection.query(query);
        res.json(results);
    } catch (error) {
        console.error('Error fetching time slots:', error);
        res.status(500).json({ error: 'Error fetching time slots' });
    } finally {
        connection.release(); // Release the connection back to the pool when done
    }
};
