import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '@/styles/ReserveForm.module.css';
import { utcToZonedTime } from 'date-fns-tz';
import { format, addDays, differenceInHours, } from 'date-fns';
import  Head  from 'next/head';

interface TimeSlot {
  id: number;
  start_time: string;
  end_time: string;
  price: number;
}
interface Reservation {
  id: number;
  name: string;
  court_id: number;
  time_slot_id: number;
  reserved_date: string;
  usedate: string;
  start_time: string;
  end_time: string;
}

export default function Page() {
  const router = useRouter();
  const { id, timeSlot, startTime, endTime, usedate } = router.query;
  const dateInBangkok = utcToZonedTime(new Date(), "Asia/Bangkok");
  const [selectedDate, setSelectedDate] = useState(dateInBangkok);
  const parsedId = parseInt(usedate as string)

  const [timeID, setTimeID] = useState(Number);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [totalhours, setTotalhours] = useState<number>();
  const [price, setPrice] = useState<number>();
  const [startvalue, setStartvalue] = useState('');
  const [endvalue, setEndvalue] = useState('');
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    if (!id || !timeSlot || !startTime || !endTime || !usedate) {
      // ตรวจสอบให้แน่ใจว่ามีค่าพารามิเตอร์ที่ต้องการทั้งหมด
      console.log('Invalid URL');
      return;
    }
    if (parsedId < 0 || parsedId > 7) {
      router.push('/booking')
      return;
    }

    setSelectedDate(addDays(dateInBangkok, parsedId))
    setStartvalue((startTime as string))
    setEndvalue((endTime as string))
    setTimeID(parseInt(timeSlot as string))
    const fetchData = async () => {
      try {
        // โหลดข้อมูล time slot จากแหล่งข้อมูล
        const response = await fetch('/api/reserve/time-slots');
        const data = await response.json();

        // ตั้งค่า state สำหรับ time slots
        setTimeSlots(data.timeSlots);
        let time_slot_id = parseInt(timeSlot as string)
        setPrice(data.timeSlots[time_slot_id].price)

      } catch (error) {
        console.error('Error fetching time slots:', error);
      }
    };

    const fetchReservations = async () => {
      try {
        const response = await fetch('/api/reserve/reservations');
        const data = await response.json();
        setReservations(data);
      } catch (error) {
        console.error('Error fetching reservations:', error);
      }
    };
    fetchReservations();
    fetchData();

  }, [router.isReady, id, timeSlot, startTime, endTime, usedate]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const date = format(selectedDate, 'dd MMMM yyyy')
    if (name == '' || phone == '') {
      setError("กรุณากรอกฟิลให้ครบ")
      return;
    }
    else if (phone.length < 10) {
      setError("กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 ตัว")
      return;
    }
    else {
      try {
        const response = await fetch('/api/reserve/reservations', {
          method: 'POST',
          body: JSON.stringify({
            name,
            phone,
            court_id: id,
            time_slot_id: timeSlot,
            startvalue,
            endvalue,
            usedate: date,
            price: price
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          // Reset form fields if needed
          setName('');
          setPhone('');
          router.replace(`/booking/Reserve/feedback/Avaliable/${parsedId}`)

        } else {

          console.error('Error submitting data');
          router.replace(`/booking/Reserve/feedback/notAvaliable/${parsedId}`)

        }
      } catch (error) {
        console.error('Error:', error);
      }
    }

  };
  const calculateTotalPrice = (startTime: string, endTime: string): number => {
    let totalPrice = 0;
    // ค้นหาช่วงเวลาที่มี start_time และ end_time ตรงกับ startTime และ endTime ที่เลือก
    const startIndex = timeSlots.findIndex((timeSlot) => timeSlot.start_time === startTime);
    const endIndex = timeSlots.findIndex((timeSlot) => timeSlot.end_time === endTime);

    if (startIndex >= 0 && endIndex >= 0) {
      for (let i = startIndex; i <= endIndex; i++) {
        totalPrice += Number(timeSlots[i].price);
      }
    }

    return totalPrice;
  };

  const handleTimeSlotChange = (value: string) => {
    const [startTime, endTime] = value.split('+');
    setStartvalue(startTime)
    setEndvalue(endTime)

    const totalPrice = calculateTotalPrice(startTime, endTime);
    setPrice(totalPrice);
  };


  const timeSlotOptions = timeSlots.map((timeSlot) => {
    const hours = differenceInHours(new Date(`2000-01-01T${timeSlot.end_time}`), new Date(`2000-01-01T${startTime}`));
    if (hours >= 1) {
      const isTimeSlotReserved = reservations.some(
        (reservation) =>
          reservation.court_id === parseInt(id as string) &&
          reservation.usedate === format(selectedDate, 'dd MMMM yyyy') &&
          (
            (reservation.start_time <= (startTime as string) && reservation.end_time > (startTime as string)) ||
            (reservation.start_time < timeSlot.end_time && reservation.end_time >= timeSlot.end_time)
          )
      );

      if (isTimeSlotReserved) {
        return null; // ไม่สร้างตัวเลือก
      }

      // แสดงตัวเลือกเมื่อไม่มีการจอง
      return (
        <option
          key={timeSlot.id}
          value={`${startTime}+${timeSlot.end_time}`}
        >
          {startTime} - {timeSlot.end_time} ({hours} ชั่วโมง)
        </option>
      );
    }

  });

  // ตัดตัวเลือกที่ไม่ถูกสร้างจากผลลัพธ์ของ map
  const lastOptionIndex = timeSlotOptions.findIndex(option => option === null);
  const filteredTimeSlotOptions = lastOptionIndex === -1 ? timeSlotOptions : timeSlotOptions.slice(0, lastOptionIndex);

  return (
    <div className={styles['reserve-form-container']}>
      <Head>
        <title>Reservation</title>
      </Head>
      <h2>จองสนามแบดมินตันคอร์ท {id} </h2>
      <h2 style={{ color: 'red' }}>วันที่ใช้คอร์ท {format(selectedDate, 'dd MMMM yyyy')}</h2>
      <br />
      <h3>ราคารวม {price} บาท</h3>

      <h6>
        เวลา{' '}
        <select className={styles.select} onChange={(e) => handleTimeSlotChange(e.target.value)}>
          {filteredTimeSlotOptions}
        </select>
      </h6>


      <form onSubmit={handleSubmit}>
        <br />
        <label>
          Name:
          <input type="text" maxLength={16} value={name} onChange={(e) => setName(e.target.value)} placeholder='ชื่อ (ไม่เกิน 16 ตัวอักษร)' required />
        </label>
        <br />
        <label>
          Phone:
          <input type="tel" maxLength={10} pattern="[0-9]+" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder='เบอร์โทร' required />
        </label>
        <br />
        <div><p style={{ color: "red" }}>{error}</p></div>
        <button type="submit">ยืนยันการจอง</button>
      </form>
    </div>
  );
}
