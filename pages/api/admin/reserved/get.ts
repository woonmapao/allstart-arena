import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/db/db';
import { getToken } from 'next-auth/jwt';
import { sanitizeReservationPriceForMysql } from '@/lib/reservationPrice';
import { mapRowsUsedateForClient, normalizeUsedateForMysql } from '@/lib/reserveUsedate';



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const connection = await pool.getConnection()
  const token = await getToken({ req })
  if (!token) {
    res.status(401).json({ message: 'Not authenticated' });
    return;
  }
  try {
    if (req.method === 'GET') {
      // ป้องการการ query วันที่ที่ไม่ต้องการให้เห็น 

      const { usedate } = req.query
      {
        const usedateMysql = normalizeUsedateForMysql(usedate);
        if (!usedateMysql) {
          res.status(400).json({ message: 'Invalid usedate' });
          return;
        }
        const deleteReserve = `DELETE FROM reserve WHERE reserved_date < (NOW() - INTERVAL 15 MINUTE) AND status = 0;`
        await connection.query(deleteReserve);
        const query = 'SELECT id,name, court_id, time_slot_id,reserved_date, usedate ,start_time,end_time, price ,status FROM reserve WHERE usedate = ?';
        const [reservations] = await connection.query(query, [usedateMysql]);
        res.json(mapRowsUsedateForClient(reservations as { usedate?: unknown }[]));
      }
    }
    else if (req.method === 'POST') {
      try {

        const { name, phone, court_id, time_slot_id, startvalue, endvalue, usedate, price } = req.body;
        const usedateMysql = normalizeUsedateForMysql(usedate);
        if (!usedateMysql) {
          res.status(400).json({ message: 'Invalid usedate' });
          return;
        }
        const priceMysql = sanitizeReservationPriceForMysql(price);
        if (!priceMysql) {
          res.status(400).json({ message: 'Invalid price' });
          return;
        }
        const insertQuery = `
       INSERT INTO reserve (name, phone, court_id, time_slot_id, start_time, end_time, usedate, price)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?
       WHERE NOT EXISTS (
       SELECT *
       FROM reserve
       WHERE court_id = ? AND usedate = ? AND (
      (CAST(start_time AS TIME) >= CAST(? AS TIME) AND CAST(end_time AS TIME) <= CAST(? AS TIME))
    )
  )
`;
        const params = [name, phone, court_id, time_slot_id, startvalue, endvalue, usedateMysql, priceMysql, court_id, usedateMysql, startvalue, endvalue
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
