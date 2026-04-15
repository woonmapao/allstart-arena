import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/db/db';
import { getToken } from 'next-auth/jwt';
import { normalizeUsedateForMysql } from '@/lib/reserveUsedate';



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const connection = await pool.getConnection()
  const token = await getToken({ req })
  if (!token) {
    res.status(401).json({ message: 'Not authenticated' });
    return;
  }
  try {
    if (req.method === 'POST') {
      try {

        const { name, phone, court_id, time_slot_id, startvalue, endvalue, usedate, price  } = req.body;
        const usedateMysql = normalizeUsedateForMysql(usedate);
        if (!usedateMysql) {
          res.status(400).json({ message: 'Invalid usedate' });
          return;
        }
        const insertQuery = `
       INSERT INTO pt_reserve (name, phone, court_id, time_slot_id, start_time, end_time, usedate, price , status )
       SELECT ?, ?, ?, ?, ?, ?, ?, ? , 2
       WHERE NOT EXISTS (
       SELECT *
       FROM pt_reserve
       WHERE court_id = ? AND usedate = ? AND (
      (CAST(start_time AS TIME) >= CAST(? AS TIME) AND CAST(end_time AS TIME) <= CAST(? AS TIME))
    )
  )
`;
        const params = [name, phone, court_id, time_slot_id, startvalue, endvalue, usedateMysql, price, court_id, usedateMysql, startvalue, endvalue
        ];
        const [result] = await connection.query(insertQuery, params);

        if ((result as any).affectedRows === 1) {
          res.status(200).json({ success: true, message: 'Data inserted successfully' });
          
        } else {
          res.status(400).json({ message: 'Duplicate data' });
        }

      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error inserting data' });
      }


    } else {
      res.status(405).json({ message: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    connection.release(); // Release the connection back to the pool when done
  }
}
