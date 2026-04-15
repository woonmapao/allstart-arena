import { format } from 'date-fns';
import React, { useEffect, useState } from 'react'
import { Button, Modal } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import styles from '@/styles/admin/reserved/new_reserved.module.css'
import Swal from 'sweetalert2'
import { utcToZonedTime } from 'date-fns-tz';
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
    const [show, setShow] = useState(false);
    const [selectedOption, setSelectedOption] = useState(0);
    const [name, setName] = useState<string>('');
    const [phone, setPhone] = useState<string>('');
    const [selectedCourtID, setselectedCourtID] = useState<number>(0);
    const [useDate, setUseDate] = useState<string>('');
    const [startTime, setStartTime] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');
    const [price, setPrice] = useState<number>(0);
    const [reserve_date, setReserve_date] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);
    const dateInBangkok = utcToZonedTime(new Date(), "Asia/Bangkok");
    const [selectedDate, setSelectedDate] = useState(dateInBangkok);



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
                const response = await fetch('/api/admin/reserved/new/updateStatus', {
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
                getReserve('');
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



    const getReserve = async (searchTerm: string) => {

        let url = `/api/admin/reserved/history?`
        if (searchTerm != '') {
            url += `search=${searchTerm}`
        }
        try {
            console.log(usedateSearch)
            const response = await fetch(url);
            const data = await response.json();
            if (response.ok) {
                setreserve(data);
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
            console.log('error');
        }

    }
    useEffect(() => {
        getReserve('');
        getCourt();
        getTimeslot();
    }, []);

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
                    const response = await fetch(`/api/admin/reserved/delete?id=${item.id}`, {
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
            const response = await fetch(`/api/admin/reserved/new/update`, {
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

            getReserve('');
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


    const [searchTerm, setSearchTerm] = useState('');
    const [usedateSearch, setUsedateSearch] = useState('');


    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        getReserve(event.target.value);
    };

    const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setCurrentPage(1);
        getReserve('');
    };

    const handleDateChange = (date: Date) => {
        setSelectedDate(date);
        setUsedateSearch(format(date, 'dd MMMM yyyy'))
        setCurrentPage(1);
        getReserve(format(date, 'dd MMMM yyyy'));
    };
    const [searchby, setSearchby] = useState(true);

    const itemsPerPage = 30;

    const startIndex = (currentPage - 1) * itemsPerPage;

    const nextPage = () => {
        setCurrentPage((prevPage) => prevPage + 1);
    };

    const prevPage = () => {
        setCurrentPage((prevPage) => prevPage - 1);
    };

    return (
        <>
            <Head>
                <title>History reserveations</title>
            </Head>
            <div className={styles.container}>

                <div className={styles.box}>
                    <div>
                        <h5 className={`fw-bold `}>ค้นหาการจองด้วย
                            <Button className={`btn btn-sm  ms-2 border ${searchby ? '' : 'btn-light'}`} onClick={() => { setSearchby(true); getReserve('') }}>ชื่อ/เบอร์</Button>
                            <Button className={`btn btn-sm mx-2 border ${!searchby ? '' : 'btn-light'}`} onClick={() => {
                                setSearchby(false); getReserve(format(selectedDate, 'dd MMMM yyyy'));
                            }}>วันใช้คอร์ท</Button>
                        </h5>
                        <div className='d-flex justify-content-center text-center'>
                            {searchby &&
                                <>
                                    {/* <h5 className='mt-1 mx-1'>ชื่อ/เบอร์  </h5> */}
                                    <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
                                        <input
                                            className={styles.searchInput}
                                            type="text"
                                            placeholder="ชื่อ/เบอร์/วันที่ใช้คอร์ท"
                                            value={searchTerm}
                                            onChange={handleSearch}
                                        />
                                        <button className={styles.searchButton} type="submit">
                                            Search
                                        </button>
                                    </form>
                                </>

                            }
                            {!searchby &&
                                <>
                                    <h5 className='mt-1 mx-1'> วันที่  </h5>
                                    <DatePicker
                                        selected={selectedDate}
                                        onChange={handleDateChange}
                                        className={styles.DatePicker}
                                    />
                                </>
                            }
                        </div>
                    </div>


                    <table className={`${styles.table} table table-bordered table-striped table-sm`}>
                        <thead className='table-primary'>
                            <tr >
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
                            {reserve
                                .slice(startIndex, startIndex + itemsPerPage)
                                .map((item, index) => {
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
                            {reserve.length <= 0 &&
                                <tr>
                                    <td colSpan={10}>ไม่พบการจอง</td>
                                </tr>
                            }

                        </tbody>
                    </table>

                    <div className="d-flex justify-content-end">
                        {currentPage > 1 && (

                            <Button
                                className='mx-2'
                                onClick={() => { prevPage() }}
                            >
                                หน้าก่อนหน้า
                            </Button>)}
                        {reserve.length > startIndex + itemsPerPage && (

                            <Button
                                onClick={() => { nextPage() }}
                            >
                                หน้าถัดไป
                            </Button>)}


                    </div>




                </div >

            </div >
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
                <Modal.Body>
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