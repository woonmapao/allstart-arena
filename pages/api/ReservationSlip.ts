import { NextApiRequest, NextApiResponse } from 'next';
import cloudinary from 'cloudinary';
import multiparty from 'multiparty';
import pool from '@/db/db';
import { format, utcToZonedTime } from 'date-fns-tz';

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.SECRET,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const connection = await pool.getConnection()

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const form = new multiparty.Form();

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
      }

      try {
        // Get the uploaded file from the files object
        const file = files.file[0];

        // Upload the image to Cloudinary
        const result = await cloudinary.v2.uploader.upload(file.path, {
          folder: 'upload', // Set the desired folder name
          resource_type: 'image', // Specify the resource type (image, video, raw)
        });

        console.log(result);

        // Return the Cloudinary image URL
        const name = fields.name;
        const court_id = fields.court_id;
        const startvalue = fields.startvalue;
        const endvalue = fields.endvalue;
        const usedate = fields.usedate;
        const dateInBangkok = utcToZonedTime(new Date(), "Asia/Bangkok");
        const today = format(dateInBangkok, 'dd MMMM yyyy')
        if (result.secure_url) {
          try {
            await connection.query('UPDATE reserve SET slip = ? ,status =? , pay_date = ? WHERE name = ? AND court_id = ? AND start_time = ? AND end_time = ? AND usedate = ?', [
              result.secure_url, 1, today, name, court_id, startvalue, endvalue, usedate
            ]);
            return res.status(200).json({ imageUrl: result.secure_url });
          } catch {
            return res.status(500).json({ error: 'Server error' });
          }
        } else {
          return res.status(500).json({ error: 'Failed to upload image to Cloudinary' });
        }
      } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
      }
    });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release(); // Release the connection back to the pool when done
  }
}
