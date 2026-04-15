import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '@/styles/admin/ReserveBadmintonCourt.module.css';
import { format, addDays, isAfter, differenceInCalendarDays, parse, differenceInHours } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { GetServerSideProps } from 'next';
import { Button, Modal } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Swal from 'sweetalert2';
import Head from 'next/head';

interface TimeSlot {
  id: number;
  start_time: string;
  end_time: string;
  price: number;
}

interface Court {
  id: number;
  title: string;
}

interface Reservation {
  [x: string]: any;
  id: number;
  name: string;
  court_id: number;
  time_slot_id: number;
  reserved_date: string;
  usedate: string;
  start_time: string;
  end_time: string;
}
interface Holidays {
  id: number;
  title: string;
  date: string;
  status: number;
}
interface Props {
  timeSlots: TimeSlot[];
  courts: Court[];
  timeZone: string;
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {

  try {
    const timeZone = 'Asia/Bangkok';
    const courts = await fetch(`${process.env.HOSTNAME}/api/practice-court/reserve/courts`);
    const courts_data = await courts.json();
    const timeslots = await fetch(`${process.env.HOSTNAME}/api/practice-court/reserve/time-slots`);
    const timeslots_data = await timeslots.json();


    return {
      props: {
        timeSlots: timeslots_data.timeSlots,
        courts: courts_data.courts,
        timeZone: timeZone
      },
    }



  } catch (error) {
    return {
      props: {
        timeSlots: [],
        courts: [],
        timeZone: "Asia/Bangkok"

      },
    };
  }

}


function ReserveBadmintonCourt({ timeSlots, courts, timeZone }: Props,) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [foundHoliday, setFoundHoliday] = useState<Holidays[]>([])
  const [isHoliday, setIsHoliday] = useState(false);
  const [show, setShow] = useState(false);
  const [price, setPrice] = useState<number>();
  const [startvalue, setStartvalue] = useState('');
  const [endvalue, setEndvalue] = useState('');
  const [startTime, setStartTime] = useState('');
  const [courtID, setCourtID] = useState(0);
  const [time_slot_id, setTime_slot_id] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const handleClose = () => {
    setShow(false);
  }

  const getReservations = async (usedate: string) => {
    const response = await fetch(`/api/admin/practice-court/reserved/get?usedate=${usedate}`);
    const data = await response.json();
    setReservations(data);
  };

  const dateInBangkok = utcToZonedTime(new Date(), timeZone);
  const parsedId = parseInt(router.query.id as string)

  const [selectedDate, setSelectedDate] = useState(addDays(dateInBangkok, parsedId));

  const selectDate = (id: number) => {
    setSelectedDate(addDays(dateInBangkok, id))
  }
  const getHoliday = async () => {
    try {
      const selectDate = format(selectedDate, 'dd-MM-yyyy')
      const response = await fetch(`/api/reserve/holidays?date=${selectDate}`);
      const data = await response.json();
      if (data.results.length >= 1) {
        setFoundHoliday(data.results);
        if (data.results[0].status === 0) {
          setIsHoliday(true)
        } else {
          setIsHoliday(false)
        }
      } else {
        setIsHoliday(false)
      }
    } catch {
      console.log('error');
    }
  };

  useEffect(() => {
    getHoliday();
    const usedate = format(selectedDate, 'dd MMMM yyyy');
    getReservations(usedate);
    selectDate(parsedId);
  }, [parsedId ]);



  const setbtn = (addDay: number) => {
    setSelectedDate(addDays(dateInBangkok, addDay))
    router.push(`/admin/backend/practice-court/booking/${encodeURIComponent(addDay)}`)
  }

  const handleCourtReservation = async (
    courtId: number,
    timeSlotId: number,
    startTime: string,
    endTime: string,
    price: number,
    usedate: string
  ) => {
    const response = await fetch(`/api/admin/practice-court/reserved/get?usedate=${usedate}&parsedId=${parsedId}`);
    const data: Reservation = await response.json();
    const reservation = data.find(
      (reservation: Reservation) =>
        reservation.court_id === courtId &&
        reservation.usedate === format(selectedDate, 'dd MMMM yyyy') &&
        (
          (reservation.start_time <= startTime && reservation.end_time >= endTime)
        )
    );
    const isAvailable = !reservation;
    const isExpired = reservation && isAfter(new Date(), new Date(reservation.usedate));
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
      }
    })
    if (isAvailable && !isExpired) {
      setPrice(price)
      setStartTime(startTime);
      setTime_slot_id(timeSlotId);
      setCourtID(courtId);
      setStartvalue(startTime)
      setEndvalue(endTime)
      setShow(true);
    } else {

      Toast.fire({
        icon: 'error',
        title: 'มีคนจองไปแล้ว'
      })

      const usedate = format(selectedDate, 'dd MMMM yyyy');
      getReservations(usedate);
    }

  };


  // Function to handle date change
  const handleDateChange = (date: Date) => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const currentDate = `${year}-${month}-${day}`;
    const Sdate = new Date(currentDate)
    const diff = new Date(); // The current date and time

    // Calculate the difference in days
    const daysDiff = differenceInCalendarDays(Sdate, diff);
    setbtn(daysDiff)
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
          reservation.court_id === courtID &&
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const date = format(selectedDate, 'dd MMMM yyyy')

    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
      }
    })
    try {
      const response = await fetch('/api/admin/practice-court/reserved/reservations', {
        method: 'POST',
        body: JSON.stringify({
          name : name? name : 'admin',
          phone,
          court_id: courtID,
          time_slot_id: time_slot_id,
          startvalue,
          endvalue,
          usedate: date,
          price: 0,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Reset form fields if needed
        setName('');
        setPhone('');
        const usedate = format(selectedDate, 'dd MMMM yyyy');
        getReservations(usedate);
        setShow(false);

        Toast.fire({
          icon: 'success',
          title: 'บันทึกสำเร็จ'
        })

      } else {
        Toast.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด'
        }).then(() => {
          const usedate = format(selectedDate, 'dd MMMM yyyy');
          getReservations(usedate);

        })
        console.error('Error submitting data');

      }
    } catch (error) {
      console.error('Error:', error);
    }


  };

  return (
    <>
      <Head>
        <title>Practice court Booking </title>
      </Head>

      <div className={`${styles.container} `}>

        {/* {isLoading && (
                    <div className={styles.loading}>
                        <div className={styles.spinner}></div>
                    </div>
                )} */}

        <div>

          <div className={styles.tableWrapper}>
            <table className={`${styles.table}  ${isLoading ? styles.load : ''}`} >
              <thead>
                <tr >
                  <td colSpan={courts.length + 1} className={styles.reserveDate}>
                   <span> <span className='text-dark'> Practice court Reservation for </span> {selectedDate && format(selectedDate, 'dd MMMM yyyy')}</span>
                  </td>
                </tr>

                <tr>
                  <td >
                    <div className={styles.date_wrapper}>
                      <p>เดือน/วัน/ปี</p>
                      <DatePicker
                        selected={selectedDate}
                        onChange={handleDateChange}
                        className={styles.DatePicker}
                      /></div>
                  </td>
                  <th colSpan={courts.length + 1} className={styles.reserveDate}>


                    <button className={`${styles.btn} ${parsedId == 0 ? styles.active : ''}`} onClick={() => setbtn(0)}>{format((dateInBangkok), 'dd MMMM ')}</button>
                    <button className={`${styles.btn} ${parsedId == 1 ? styles.active : ''}`} onClick={() => setbtn(1)}>{format(addDays(dateInBangkok, 1), 'dd MMMM ')}</button>
                    <button className={`${styles.btn} ${parsedId == 2 ? styles.active : ''}`} onClick={() => setbtn(2)}>{format(addDays(dateInBangkok, 2), 'dd MMMM ')}</button>
                    <button className={`${styles.btn} ${parsedId == 3 ? styles.active : ''}`} onClick={() => setbtn(3)}>{format(addDays(dateInBangkok, 3), 'dd MMMM ')}</button>
                    <button className={`${styles.btn} ${parsedId == 4 ? styles.active : ''}`} onClick={() => setbtn(4)}>{format(addDays(dateInBangkok, 4), 'dd MMMM ')}</button>
                    <button className={`${styles.btn} ${parsedId == 5 ? styles.active : ''}`} onClick={() => setbtn(5)}>{format(addDays(dateInBangkok, 5), 'dd MMMM ')}</button>
                    <button className={`${styles.btn} ${parsedId == 6 ? styles.active : ''}`} onClick={() => setbtn(6)}>{format(addDays(dateInBangkok, 6), 'dd MMMM ')}</button>
                    <button className={`${styles.btn} ${parsedId == 7 ? styles.active : ''}`} onClick={() => setbtn(7)}>{format(addDays(dateInBangkok, 7), 'dd MMMM ')}</button>

                  </th>
                </tr>
                {!isHoliday &&
                  <tr>
                    <th className={styles.tablehead}>Time/Court</th>

                    {courts && courts.length > 0 && (

                      courts.map((court) => (<th className={styles.tablehead} key={court.id}> {court.title}</th>))
                    )

                    }
                  </tr>
                }

              </thead>

              {!isHoliday &&
                // if 
                <tbody>
                  {
                    timeSlots.map((timeSlot) => (
                      <tr key={timeSlot.id}>
                        <td className={styles.time}>
                          {timeSlot.start_time} - {timeSlot.end_time}
                        </td>
                        {courts.map((court) => {
                          const reservation = reservations.find(
                            (reservation) =>
                              reservation.court_id === court.id &&
                              reservation.usedate === format(selectedDate, 'dd MMMM yyyy') &&
                              (
                                (reservation.start_time <= timeSlot.start_time && reservation.end_time >= timeSlot.end_time)
                              )
                          );
                          const isAvailable = !reservation;
                          const isExpired = reservation && isAfter(new Date(), new Date(reservation.usedate));


                          return (
                            <td
                              key={court.id}
                              className={`${styles.cell} ${isAvailable ? styles.available : styles.reserved} ${isExpired ? styles.expired : ''
                                }`}
                              onClick={() => {

                                if (isAvailable && !isExpired) {
                                  handleCourtReservation(
                                    court.id,
                                    timeSlot.id,
                                    timeSlot.start_time,
                                    timeSlot.end_time,
                                    timeSlot.price,
                                    format(selectedDate, 'dd MMMM yyyy')

                                  );
                                }
                              }}
                            >
                              {isAvailable ? timeSlot.price + " ฿" : reservation.name}
                            </td>
                          );


                        })}
                      </tr>
                    ))}
                </tbody>
              }


            </table>
            {
              isHoliday &&
              <div className='d-flex justify-content-center fs-5 flex-column '>
                <span className='d-flex justify-content-center'>วันที่เลือกหยุดให้บริการเนื่องจาก</span>
                <span className='d-flex justify-content-center fs-5 text-danger fw-bold'>{foundHoliday[0].title}</span>

              </div>


            }
          </div>
        </div>
        <Modal

          show={show}
          onHide={handleClose}
          backdrop="static"
          keyboard={false}
          centered
        >
          <Modal.Header closeButton >
            <Modal.Title><h6>จองใช้สนาม วันที่ <span style={{ color: 'red' }}>{selectedDate && format(selectedDate, 'dd MMMM yyyy')}</span></h6></Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className={styles['reserve-form-container']}>
              <h2>จองสนามแบดมินตันคอร์ท {courtID} </h2>
              <h3>ราคารวม {0} บาท</h3>
              <h6>
                เวลา{' '}
                <select className={styles.select} onChange={(e) => handleTimeSlotChange(e.target.value)}>
                  {filteredTimeSlotOptions}
                </select>
              </h6>
              <form id="myForm" onSubmit={handleSubmit}>
                <label>
                  Name:
                  <input type="text" maxLength={16} value={name || 'admin'} onChange={(e) => setName(e.target.value)} placeholder='ชื่อ (ไม่เกิน 16 ตัวอักษร)' />
                </label>
                <div><p style={{ color: "red" }}>{error}</p></div>
              </form>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button form="myForm" type="submit">ยืนยันการจอง</Button>
            <Button onClick={handleClose} className='btn-secondary'>ยกเลิก</Button>
          </Modal.Footer>
        </Modal>

      </div >
    </>
  );

}


export default ReserveBadmintonCourt;