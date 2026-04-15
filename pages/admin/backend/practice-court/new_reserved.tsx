
import React, { useEffect, useState } from 'react'
import { Button, Modal } from 'react-bootstrap';
import 'react-datepicker/dist/react-datepicker.css';
import styles from '@/styles/admin/reserved/new_reserved.module.css'
import Swal from 'sweetalert2'
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image'


interface Reserve {
    id: number;
    name: string;
    phone: string;
    court_id: number;
    time_slot_id: number;
    reserved_date: string;
    usedate: string;
    start_time: string;
    end_time: string;
    price: number;
    status: number;
    slip: string;
}

interface Court {
    id: number;
    title: string;
    status: number;
}

interface TimeSlot {
    id: number;
    start_time: string;
    end_time: string;
    price: number;
}

function Holiday() {
    const [reserve, setreserve] = useState<Reserve[]>([])
    const [courts, setCourts] = useState<Court[]>([])
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

    const [reservations1, setReservations1] = useState<Reserve>();

    const [filter, setFilter] = useState<string>("transferred");

    const [isreserve, setIsreserve] = useState(false);

    const [status, setStatus] = useState(1);

    const [show, setShow] = useState(false);

    const [selectedOption, setSelectedOption] = useState(0); // State to track the selected option

    const [name, setName] = useState<string>('');
    const [phone, setPhone] = useState<string>('');
    const [selectedCourtID, setselectedCourtID] = useState<number>(0);
    const [useDate, setUseDate] = useState<string>('');
    const [startTime, setStartTime] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');
    const [price, setPrice] = useState<number>(0);
    const [reserve_date, setReserve_date] = useState<string>('');



    const [currentPage, setCurrentPage] = useState(0);
    const [message, setMessage] = useState('');

    const handleOptionChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(event.target.value)
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
        if (event) {
            try {
                const response = await fetch('/api/admin/practice-court/reserved/new/updateStatus', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ id: reservations1?.id, newStatus: value }),
                });

                if (!response.ok) {

                    Toast.fire({
                        icon: 'error',
                        title: 'เกิดข้อผิดพลาด'
                    })
                    throw new Error('An error occurred while updating the data.');
                }

                setSelectedOption(value);
                Toast.fire({
                    icon: 'success',
                    title: 'แก้ไขสถานะเรียบร้อย'
                })
                getReserve(status, currentPage);
            } catch (error: any) {
                console.error(error.message);
                // Handle any error or display an error message
            }
        }


    };

    const getTimeslot = async () => {
        try {
            // โหลดข้อมูล time slot จากแหล่งข้อมูล
            const response = await fetch('/api/reserve/time-slots');
            const data = await response.json();
            // ตั้งค่า state สำหรับ time slots
            setTimeSlots(data.timeSlots);
            //   setPrice(data.timeSlots[timeID].price)
        } catch (error) {
            console.error('Error fetching time slots:', error);
        }
    };
    const router = useRouter();
    const { state } = router.query;
    useEffect(() => {
        setFilter(state as string);
        setStatus(parseInt(state as string));
        getReserve(parseInt(state as string), currentPage);
        getCourt();
        getTimeslot();
    }, [currentPage, state]);


    const getReserve = async (status: number, currentPage: number) => {

        try {
            const response = await fetch(`/api/admin/practice-court/reserved/new/get?status=${status}&page=${currentPage}`);
            setStatus(status);
            const data = await response.json();
            if (response.ok) {
                setreserve(data);
                setIsreserve(true);
            } else {
                setIsreserve(false);
            }
        } catch {
            console.log('error');
        }
    };
    const getCourt = async () => {
        try {
            const courts = await fetch(`/api/reserve/courts`);
            const courts_data = await courts.json();
            setCourts(courts_data.courts);
        } catch {
            alert("error")
        }

    }


    const [loading, setLoading] = useState(false);


    const deletereserve = async (item: Reserve) => {
        Swal.fire({
            title: `ต้องการลบการจอง? `,
            text: `การจองของ ${item.name} ของวันที่ ${item.usedate} เวลาใช้สนาม ${item.start_time}  - ${item.end_time}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await fetch(`/api/admin/practice-court/reserved/delete?id=${item.id}`, {
                        method: 'DELETE',
                    });

                    if (!response.ok) {
                        throw new Error('An error occurred while deleting the data.');
                    } else {
                        setShow(false);
                        Swal.fire(
                            'Deleted!',
                            `ลบ การจองของ ${item.name} ของวันที่ ${item.usedate} เวลาใช้สนาม ${item.start_time}  - ${item.end_time} เรียบร้อย`,
                            'success'
                        )
                    }

                    // Update the local state to remove the deleted holiday
                    setreserve((prevreserve) =>
                        prevreserve.filter((reserve) => reserve.id !== item.id)
                    );
                } catch (error: any) {
                    console.error(error.message);
                    // Handle any error or display an error message
                }

            }
        })

    };

    async function updateReserve() {
        try {
            const response = await fetch(`/api/admin/practice-court/reserved/new/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: reservations1?.id,
                    name: name,
                    phone: phone,
                    court_id: selectedCourtID,
                    start_time: startTime,
                    end_time: endTime,
                    usedate: useDate,
                    price: price,
                }),
            });

            if (!response.ok) {
                Swal.fire({
                    icon: 'error',
                    title: 'ผิดพลาด',
                    text: 'มีข้อผิดพลาดกรุณาลองใหม่อีกครั้ง',
                })
                return;
            }
            Swal.fire({
                icon: 'success',
                title: 'สำเร็จ',
                text: 'แก้ไขสำเร็จ',
            })

            getReserve(status, currentPage);
            setShow(false);
        } catch (error) {
            console.error('An error occurred while updating the data:', error);
            throw error;
        }
    }
    const checkslip = async (item: Reserve) => {


        if (item) {
            const date = new Date(item.reserved_date)

            const formattedDate = date.toLocaleString('th-TH', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
            setReservations1(item)
            setSelectedOption(item.status);
            const findCourt = courts.find((c) => c.id === item.court_id);
            setName(item.name);
            setPhone(item.phone);
            if (findCourt) {
                setselectedCourtID(findCourt?.id);
            }
            setUseDate(item.usedate);
            setStartTime(item.start_time);
            setEndTime(item.end_time);
            setPrice(item.price);
            setReserve_date(formattedDate)
        }

    }

    const showslip = () => {
        Swal.fire({
            imageUrl: reservations1?.slip, // Replace with your image URL
            imageAlt: 'Image Alt Text',
            showCloseButton: true,
            focusConfirm: false,
            title: `${price} บาท`,
            confirmButtonText: 'Close',
        });
    }

    const isChange = () => {
        if (reservations1?.name != name ||
            reservations1.phone != phone ||
            reservations1.usedate != useDate ||
            reservations1.start_time != startTime ||
            reservations1.end_time != endTime ||
            reservations1.price != price ||
            reservations1.court_id != selectedCourtID) {
            return true;
        }
    }

    const handleCourtsChange = (value: string) => {
        const intValue = parseInt(value);
        setselectedCourtID(intValue);
    };
    const handleStart_timeChange = (value: string) => {
        setStartTime(value);
        setPrice(calculateTotalPrice(value, endTime))

    };
    const handleEnd_timeChange = (value: string) => {
        setEndTime(value);
        setPrice(calculateTotalPrice(startTime, value))


    };

    const CourtOption = courts.map((court) => {

        return (
            <option
                key={court.id}
                value={court.id}
            >
                {court.title}
            </option>
        );
    });

    const start_time_option = timeSlots.map((timeSlot) => {

        return (
            <option
                key={timeSlot.id}
                value={timeSlot.start_time}
            >
                {timeSlot.start_time}
            </option>
        );
    });

    const end_time_option = timeSlots.map((timeSlot) => {

        return (
            <option
                key={timeSlot.id}
                value={timeSlot.end_time}
            >
                {timeSlot.end_time}
            </option>
        );
    });

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

    return (
        <>
            <Head>
                <title>New reservations</title>
            </Head>
            <div className={styles.container}>

                <div className={styles.box}>
                    <div className={styles.footer1}>
                        <h5 className={`fw-bold ${styles.btn1}`}>ตรวจสอบการโอนเงิน จองสนามซ้อม</h5>
                        <div className='d-flex justify-content-end mb-2'>

                            <Button
                                onClick={() => {
                                    setCurrentPage(0);
                                    setFilter('2');
                                    router.replace(`/admin/backend/practice-court/new_reserved?state=2`)
                                    // getReserve(2, currentPage);
                                }}
                                style={{
                                    backgroundColor: filter === '2' ? 'blue' : 'white',
                                    color: filter === '2' ? 'white' : 'black',
                                }}
                            >
                                ตรวจสอบแล้ว
                            </Button>
                            <Button
                                className=' d-flex  mx-2 '
                                onClick={() => {
                                    setCurrentPage(0);
                                    setFilter('1');
                                    router.replace(`/admin/backend/practice-court/new_reserved?state=1`)
                                    // getReserve(status, currentPage);
                                }}
                                style={{
                                    backgroundColor: filter === '1' ? 'green' : 'white',
                                    color: filter === '1' ? 'white' : 'black',
                                }}
                            >
                            <Image src='/new-icon.svg' alt='new-icon' width={20} height={20}/>การจองใหม่
                                
                            </Button>
                            <Button
                                onClick={() => {
                                    setCurrentPage(0);
                                    setFilter('0');
                                    router.replace(`/admin/backend/practice-court/new_reserved?state=0`)

                                    // getReserve(0, currentPage);
                                }}
                                style={{
                                    backgroundColor: filter === '0' ? 'red' : 'white',
                                    color: filter === '0' ? 'white' : 'black',
                                }}
                            >
                                ยังไม่โอน
                            </Button>
                        </div>
                    </div>


                    <table className={`${styles.table} table table-bordered table-striped  table-sm`}>
                        <thead className='table-primary'>
                            <tr>
                                <th scope="col" className={styles.hide_on_mobile}>#</th>
                                <th scope="col">คอร์ท</th>
                                <th scope="col">ชื่อ</th>
                                <th scope="col" className={styles.hide_on_mobile}>เบอร์โทร</th>
                                <th scope="col" className={styles.hide_on_mobile}>วันใช้คอร์ท</th>
                                <th scope="col" className={styles.hide_on_mobile}>เวลา</th>
                                <th scope="col" className={styles.hide_on_mobile}>ราคารวม</th>
                                <th scope="col" className={styles.hide_on_mobile}>สถานะ</th>
                                <th scope="col">สลิป/แก้ไข</th>
                                <th scope="col">ลบ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reserve.map((item, index) => {
                                const findCourt = courts.find((c) => c.id === item.court_id);
                                return (
                                    <tr key={item.id}>
                                        <td className={styles.hide_on_mobile}>{index + 1}</td>
                                        <td>{findCourt?.title}</td>
                                        <td>{item.name}</td>
                                        <td className={styles.hide_on_mobile} >{item.phone !== "" ? item.phone : '-'}</td>
                                        <td className={styles.hide_on_mobile}>{item.usedate}</td>
                                        <td className={styles.hide_on_mobile}>{item.start_time} - {item.end_time}</td>
                                        <td className={styles.hide_on_mobile}>{item.price}</td>
                                        <td className={styles.hide_on_mobile} style={{ backgroundColor: item.status === 1 ? '#FDCE4E' : item.status === 2 ? '#d1e7dd' : '#eccccf' }}>
                                            {item.status === 1 ? 'กำลังตรวจสอบ' : item.status === 2 ? 'ชำระแล้ว' : 'ยังไม่ชำระ'}
                                        </td>
                                        <td><Button className="btn-sm" onClick={() => { checkslip(item); setShow(true); }}>สลิป/แก้ไข</Button></td>

                                        <td>
                                            <Button
                                                className="btn-sm btn-danger"
                                                onClick={() => deletereserve(item)}
                                            >
                                                ลบ
                                            </Button></td>

                                    </tr>
                                );
                            })}


                        </tbody>
                    </table>

                    {filter == "2" &&
                        <div className="d-flex justify-content-end">
                            <Button
                                className='mx-2'
                                onClick={() => { setCurrentPage(currentPage - 1); }}
                                disabled={currentPage === 0}
                            >
                                ก่อนหน้า
                            </Button>
                            <Button
                                onClick={() => { setCurrentPage(currentPage + 1); }}
                            >
                                ถัดไป
                            </Button>
                        </div>
                    }



                </div>

            </div>
            <Modal

                show={show}
                onHide={() => setShow(false)}
                backdrop={true}
                keyboard={false}
                centered
                animation={false}
            // size='lg'
            >
                <Modal.Header closeButton >
                    <Modal.Title><h6>ข้อมูลการจอง จองใช้งานวันที่ {reservations1?.usedate}</h6></Modal.Title>
                </Modal.Header>
                <Modal.Body className={`${loading ? styles.load : ''}`}>
                    <div>
                        <div className={styles.wrapper1}>
                            <div className={styles.img}>
                                <button onClick={() => { showslip() }}><Image src={`${reservations1?.slip === null ? '/No_image_available.png' : reservations1?.slip}`} alt="Qrcode" width="200" height="250" /></button>
                                <div className={styles.payment}>
                                    <h4>{price} <span>บาท</span></h4>
                                </div>
                                <div>
                                    <span>จองเมื่อ {reserve_date}</span>
                                </div>
                            </div>

                            <div className={styles.detail}>
                                <div className={styles.wrapper}>
                                    <p>ชื่อผู้จอง</p>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                                <div className={styles.wrapper}>
                                    <p>เบอร์โทร</p>
                                    <input
                                        className={styles.numberInput}
                                        type="tel"
                                        maxLength={10}
                                        pattern="[0-9]+"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </div>
                                <div className={styles.wrapper}>
                                    <p>คอร์ทที่จอง</p>
                                    <select className={styles.select} value={selectedCourtID} onChange={(e) => handleCourtsChange(e.target.value)}>
                                        {CourtOption}
                                    </select>
                                </div>
                                <div className={styles.wrapper}>
                                    <p>วันที่ใช้สนาม</p>
                                    <input
                                        type="text"
                                        value={useDate}
                                        onChange={(e) => setUseDate(e.target.value)}
                                    />
                                </div>
                                <div className={styles.footer1}>
                                    <p className={styles.btn1}>เวลาใช้สนาม</p>
                                    <div className={styles.slipbtn}>
                                        <select value={startTime} onChange={(e) => handleStart_timeChange(e.target.value)}>
                                            {start_time_option}
                                        </select>
                                        <span> - </span>
                                        <select value={endTime} onChange={(e) => handleEnd_timeChange(e.target.value)}>
                                            {end_time_option}
                                        </select>
                                    </div>

                                    {/* <input
                                        type="text"
                                        value={`${startTime} - ${endTime}`}
                                        onChange={(e) => {
                                            const [newStartTime, newEndTime] = e.target.value.split(' - ');
                                            setStartTime(newStartTime);
                                            setEndTime(newEndTime);
                                        }}
                                    /> */}
                                </div>
                                <div className={styles.wrapper}>
                                    <p>ราคา</p>
                                    <input
                                        className={styles.numberInput}
                                        type="number"
                                        value={price}
                                        onChange={(e) => setPrice(parseFloat(e.target.value))}
                                    />
                                </div>

                                {/* <div><h5> สถานะ </h5></div> */}
                                <div className={styles.container_radio}>
                                    <div className={styles.wrapper_radio}>
                                        <label className={`${styles.option} ${selectedOption === 0 ? styles.checked : ''}`}>
                                            <input
                                                style={{ display: "none" }}
                                                type="radio"
                                                value={0}
                                                id="option-0"
                                                checked={selectedOption === 0}
                                                onChange={handleOptionChange}
                                            />
                                            <div className={styles.dot}>
                                                <div className={styles.innerDot}></div>
                                            </div>
                                            <span>ยังไม่แนบสลิป</span>
                                        </label>

                                        <label className={`${styles.option} ${selectedOption === 1 ? styles.checked : ''}`}>
                                            <input
                                                style={{ display: "none" }}
                                                type="radio"
                                                value={1}
                                                id="option-1"
                                                checked={selectedOption === 1}
                                                onChange={handleOptionChange}
                                            />
                                            <div className={styles.dot}>
                                                <div className={styles.innerDot}></div>
                                            </div>
                                            <span>กำลังตรวจสอบ</span>
                                        </label>

                                        <label className={`${styles.option}  ${selectedOption === 2 ? styles.checked2 : ''}`}>
                                            <input
                                                style={{ display: "none" }}

                                                type="radio"
                                                value={2}
                                                id="option-2"
                                                checked={selectedOption === 2}
                                                onChange={handleOptionChange}
                                            />
                                            <div className={styles.dot}>
                                                <div className={styles.innerDot}></div>
                                            </div>
                                            <span>ตรวจสอบแล้ว</span>

                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                </Modal.Body>
                <Modal.Footer>

                    <div className={styles.footer1}>
                        <div className={styles.btn1}><Button onClick={() => deletereserve(reservations1!)} className='btn btn-danger'>ลบข้อมูล</Button></div>
                        <div className={styles.slipbtn}>
                            <Button onClick={() => updateReserve()} disabled={!isChange()} className='btn btn-success mx-2'>บันทึก</Button>
                            <Button onClick={() => setShow(false)} className='btn btn-secondary'>Close</Button>
                        </div>



                    </div>



                </Modal.Footer>
            </Modal>

        </>

    )
}

export default Holiday