import React, { use, useEffect, useState } from 'react';
import { format } from 'date-fns';
import Image from 'next/image';
import { Button, Modal } from 'react-bootstrap';
import Swal from 'sweetalert2'
import Head from 'next/head';
import styles from '@/styles/infoBuffet.module.css'
import { utcToZonedTime } from 'date-fns-tz';
import { GetServerSideProps } from 'next';
import { IsStudentEnum } from '@/enum/StudentPriceEnum';
import { ISales } from '@/interface/sales';
import { buffetStatusEnum } from '@/enum/buffetStatusEnum';
import { IBuffet } from '@/interface/buffet';
import { IBuffet_setting } from '@/interface/buffetSetting';
import { buffetPaymentStatusEnum } from '@/enum/buffetPaymentStatusEnum';
import SaleDetailModal from '@/components/modal/saleDetailModal';
import CustomTable from '@/components/table/customTable';
import useDebounce from '@/hook/use-debounce';
import { loadBuffetSettingsTriple } from '@/lib/loadBuffetSettingsServerSide';

interface Props {
    buffetSetting: IBuffet_setting;
    buffetStudentSetting: IBuffet_setting;
    buffetUniversitySetting: IBuffet_setting;
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
    const props = await loadBuffetSettingsTriple(process.env.HOSTNAME, '/api/buffet/newbie/get_setting');
    if (!props) {
        return { notFound: true };
    }
    return { props };
};

function Infobuffet({ buffetSetting, buffetStudentSetting, buffetUniversitySetting }: Props) {
    const [buffets, setBuffets] = useState<IBuffet[]>([]);
    const dateInBangkok = utcToZonedTime(new Date(), "Asia/Bangkok");
    const [show, setShow] = useState(false);
    const [buffetSelcted, setBuffetSelcted] = useState<IBuffet>();
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imgUrl, setImgUrl] = useState('')
    const [price, setPrice] = useState(0)
    const [salesData, setSalesData] = useState<ISales[]>([]);
    const [isSalesDataLoading, setIsSalesDataLoading] = useState(true);
    const [showSaleDetailModal, setShowSaleDetailModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        itemsPerPage: 15,
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
    });

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const fetchbuffet = async () => {
        setLoading(true);
        setBuffets([]);
        try {
            const params = new URLSearchParams();
            params.append('page', pagination.currentPage.toString());
            params.append('limit', pagination.itemsPerPage.toString());
            if (debouncedSearchTerm) {
                params.append('search', debouncedSearchTerm);
            }

            const res = await fetch(`/api/buffet/newbie/get?${params.toString()}`);
            const resData = await res.json()
            if (res.ok) {
                const { data, currentPage, totalPages, totalItems } = resData;
                setBuffets(data);
                setPagination({
                    itemsPerPage: 15,
                    currentPage,
                    totalPages,
                    totalItems
                })
                setLoading(false);
            } else {
                Swal.fire({
                    title: 'เกิดข้อผิดพลาด',
                    icon: 'error',
                });
            }
        } catch (error) {
            console.error('Error:', error);
        }

    }

    useEffect(() => {
        fetchbuffet();
    }, [pagination.currentPage, pagination.itemsPerPage, debouncedSearchTerm]);

    const showSlipImg = () => {
        Swal.fire({
            imageUrl: "/QR_Buffet.jpg",
            imageHeight: 300,
            imageAlt: "Slip สำหรับชำระเงิน"
        });
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files && event.target.files[0];
        if (file) {
            setSelectedFile(file);

            // Preview the selected image
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target && typeof event.target.result === 'string') {
                    const imageUrl = event.target.result;
                    setImgUrl(imageUrl);
                }

                setPreviewImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    const handleUpload = async () => {
        if (selectedFile) {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('id', buffetSelcted!.id.toString());

            try {
                Swal.fire({
                    title: 'กำลังบันทึก...',
                    text: 'โปรดอย่าปิดหน้านี้',
                    timerProgressBar: true,
                    allowOutsideClick: false,

                    didOpen: () => {
                        Swal.showLoading();
                    },
                });
                const response = await fetch('/api/buffet/newbie/add', {
                    method: 'PUT',
                    body: formData,
                });


                if (response.ok) {
                    setShow(false);

                    Swal.fire({
                        position: 'center',
                        icon: 'success',
                        title: 'บันทึกสำเร็จ',
                        showConfirmButton: false,
                        timer: 900,
                    }).then(() => {
                        fetchbuffet()
                        setSelectedFile(null);
                        setPreviewImage(null);
                    })

                } else {
                    console.error('Error:', response.statusText);
                }
            } catch (error) {
                console.error('Error:', error);
            }

        }
    };
    const confirm = () => {
        Swal.fire({
            title: `ต้องการส่งภาพสลิปนี้ ?`,
            imageUrl: imgUrl,
            imageHeight: 250,
            imageWidth: 200,
            showCancelButton: true,
            cancelButtonText: "ยกเลิก",
            confirmButtonText: 'ตกลง',

        }).then((result) => {
            if (result.isConfirmed) {
                handleUpload();
            } else {
                console.log('User canceled the action.');
            }
        })
    }

    const calculateSummary = async (buffet_id: number) => {
        try {
            const res = await fetch(`/api/buffet/newbie/getone?id=${buffet_id}`)
            const data = await res.json()
            if (res.ok) {
                const buffet: IBuffet = data[0]
                setBuffetSelcted(buffet);
                if (buffet) {
                    const shoppingMoney = Number(buffet?.pendingMoney ?? 0);
                    if (buffet.isStudent === IsStudentEnum.Student) {
                        const calculatePricePerOne = buffetStudentSetting?.shuttle_cock_price / 4
                        const calculatedPrice = buffetStudentSetting.court_price + (buffet?.shuttle_cock * calculatePricePerOne) + shoppingMoney;
                        setPrice(calculatedPrice);
                    } else if (buffet.isStudent === IsStudentEnum.University) {
                        const calculatePricePerOne = buffetUniversitySetting?.shuttle_cock_price / 4
                        const calculatedPrice = buffetUniversitySetting.court_price + (buffet?.shuttle_cock * calculatePricePerOne) + shoppingMoney;
                        setPrice(calculatedPrice);
                    } else {
                        const calculatePricePerOne = buffetSetting?.shuttle_cock_price / 4
                        const calculatedPrice = buffetSetting.court_price + (buffet?.shuttle_cock * calculatePricePerOne) + shoppingMoney;
                        setPrice(calculatedPrice);
                    }
                    setShow(true);
                } else {
                    Swal.fire({
                        title: 'ไม่พบข้อมูล',
                        icon: 'error',
                    });
                }
            } else {
                Swal.fire({
                    title: 'เกิดข้อผิดพลาด',
                    icon: 'error',
                });
            }
        } catch (error) {
            console.error('Error:', error);
        }

    };

    const getSalesData = async (buffet_id: number) => {
        try {
            setSalesData([]);
            setIsSalesDataLoading(true);
            const response = await fetch(`/api/get-by-customer?buffetId=${buffet_id}&buffetStatus=${buffetStatusEnum.BUFFET}`);
            const data = await response.json();
            if (response.status === 404) {
                return;
            }
            if (!response.ok) {
                Swal.fire({
                    icon: 'error',
                    title: 'ไม่พบข้อมูล'
                })
            }
            setSalesData(data.sales);
            setShow(false);
            setShowSaleDetailModal(true);
        } catch (error) {
            console.error('Error fetching salesDetail:', error);
        } finally {
            setIsSalesDataLoading(false);

        }
    };


    const handleCloseDetailModal = () => {
        setShowSaleDetailModal(false);
        setShow(true);
    }

    const column = [
        {
            label: 'รหัสลูกค้า',
            key: 'barcode',
        },
        {
            label: 'ชื่อเล่น',
            key: 'nickname',
        },
        {
            label: 'สถานะ',
            key: 'paymentStatus',
            formatter: (cell: any, row: IBuffet) => (
                <div className='text-center' style={{
                    backgroundColor: row.paymentStatus === buffetPaymentStatusEnum.PENDING ? '#eccccf' :
                        row.paymentStatus === buffetPaymentStatusEnum.CHECKING ? '#FDCE4E' :
                            row.paymentStatus === buffetPaymentStatusEnum.PAID ? '#d1e7dd' : '#eccccf',
                    borderRadius: '8px'
                }}>
                    {row.paymentStatus === buffetPaymentStatusEnum.PENDING ? 'ยังไม่ชำระ' :
                        row.paymentStatus === buffetPaymentStatusEnum.CHECKING ? 'รอตรวจสอบ' :
                            row.paymentStatus === buffetPaymentStatusEnum.PAID ? 'ชำระแล้ว' : 'สลิปไม่ถูกต้อง'}
                </div>
            )
        },
        {
            label: 'ชำระเงิน',
            key: 'actions',
            formatter: (cell: any, row: IBuffet) => (
                <Button className='btn btn-sm' onClick={() => calculateSummary(row.id)}>
                    ชำระเงิน
                </Button>
            )
        }
    ]

    const handlePageChange = (newPage: number) => {
        setPagination({
            ...pagination,
            currentPage: newPage
        });
    };

    // -------------------------------------------------------------------------------------------------------------------
    return (
        <>
            <div className={styles.container} style={{ overflow: 'auto' }}>
                <Head>
                    <title>ข้อมูลตีบุีฟเฟ่ต์</title>
                </Head>

                <h5 className={styles.title}>ข้อมูลการจองตีบุ๊ฟเฟต์ วันที่ <span style={{ color: 'red' }}>{format(dateInBangkok, 'dd MMMM yyyy')}</span></h5>
                <div className={`${styles['table-container']}`}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '4px 0'
                    }}>
                        <span className="">แสดง {buffets.length} จาก {pagination.totalItems} รายการ</span>
                        <div className="d-flex align-items-center">
                            <label className="me-2 d-flex align-items-center">
                                <span className="me-2">ค้นหา:</span>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder='ชื่อเล่น/รหัสลูกค้า'
                                    style={{ width: '150px' }}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}

                                />
                            </label>
                        </div>
                    </div>
                    <CustomTable data={buffets}
                        columns={column}
                        isLoading={loading}
                        currentPage={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        itemsPerPage={pagination.itemsPerPage}
                        onPageChange={handlePageChange}
                        isShowPagination />
                </div>

            </div>
            <Modal
                contentClassName={styles.Modal}
                show={show}
                onHide={() => { setShow(false); setSelectedFile(null); setPreviewImage(null) }}
                backdrop="static"
                keyboard={false}
                centered
                size='xl'
                // dialogClassName={styles.Modal1}
                scrollable={true}
                fullscreen="sm-down"
            >
                <Modal.Header closeButton >
                    <Modal.Title>ข้อมูลการจองตีก๊วน / ชำระเงิน  {buffetSelcted?.isStudent === IsStudentEnum.Student ? <h6>นักเรียน</h6> : buffetSelcted?.isStudent === IsStudentEnum.University ? <h6>นักศึกษา</h6> : ''}</Modal.Title>
                </Modal.Header>
                <Modal.Body >
                    <div>
                        <div className={styles.wrapper1}>
                            <div className={styles.img}>
                                <Image src={previewImage ? previewImage : '/QR_Buffet.jpg'} alt="QR_Buffet" width="280" height="280" onClick={() => showSlipImg()} />
                                {buffetSelcted?.paymentStatus !== buffetPaymentStatusEnum.PENDING && (
                                    <div style={{ textAlign: "center" }}>
                                        {buffetSelcted?.paymentStatus === buffetPaymentStatusEnum.CHECKING && (
                                            <div><h5> สถานะ  <span style={{ color: 'orange' }}>กำลังตรวจสอบสลิป</span></h5></div>

                                        )}
                                        {buffetSelcted?.paymentStatus === buffetPaymentStatusEnum.PAID && (

                                            <div><h5> สถานะ   <span style={{ color: 'green' }}>ชำระเงินสำเร็จ</span></h5></div>
                                        )}
                                        {buffetSelcted?.paymentStatus === buffetPaymentStatusEnum.REJECT && (

                                            <div><h5> สถานะ   <span style={{ color: 'red' }}>ปฏิเสธสลิป</span></h5></div>
                                        )}
                                    </div>

                                )}
                            </div>
                            <div className={styles.detail}>
                                <div className={styles.wrapper}>
                                    <p>ชื่อลูกค้า</p>
                                    <p>{buffetSelcted?.nickname}</p>
                                </div>
                                <div className={styles.wrapper}>
                                    <p>วันที่เล่น</p>
                                    <p>{buffetSelcted?.usedate}</p>
                                </div>
                                {buffetSelcted?.shuttlecock_details?.map((detail) => {
                                    return (
                                        <div key={detail.shuttlecock_type_id} className={styles.wrapper}>
                                            <p className="mb-0">ลูก {detail.shuttlecock_type} (คนละ {detail.price / 4}฿)</p>
                                            <p>{detail.quantity} ลูก</p>
                                        </div>
                                    );
                                })}
                                {buffetSelcted?.shuttlecock_details && (
                                    <div className={styles.wrapper}>
                                        <p>รวมค่าลูก</p>
                                        <p>{buffetSelcted?.shuttlecock_details?.reduce((total, detail) => {
                                            return total + (detail.price * detail.quantity) / 4;
                                        }, 0) || 0} บาท</p>
                                    </div>
                                )}

                                <div className={styles.wrapper}>
                                    <p>ค่าสนาม</p>
                                    <p>{buffetSelcted?.court_price} บาท</p>
                                </div>
                                {buffetSelcted?.pendingMoney &&
                                    <div className={styles.wrapper}>
                                        <p>สินค้าที่ซื้อ</p>
                                        {/* <p>{`${buffetSetting?.shuttle_cock_price} / 4  = ${buffetSetting?.shuttle_cock_price / 4}`} บาท /คน/ลูก</p> */}
                                        <a className={styles.a} onClick={() => getSalesData(buffetSelcted.id)}>{buffetSelcted?.pendingMoney} บาท</a>
                                    </div>}
                                <h4 style={{ textAlign: "center" }}>
                                    ทั้งหมด <span style={{ color: 'red' }}>{buffetSelcted?.total_price}</span> บาท
                                </h4>
                                <span style={{ color: 'red', textAlign: "center" }}>หากโอนแล้วกรุณาแนบสลิปเมนูข้างล่าง</span>
                                <span style={{ color: 'red', textAlign: "center" }}>**โปรดชำระหลังเล่นเสร็จแล้วเท่านั้น**</span>

                            </div>
                        </div>

                    </div>
                </Modal.Body>
                <Modal.Footer  >
                    <div className={styles.footer1}>
                        <div className={styles.btn1}><Button className='btn-info '><a href="/QR_Buffet.jpg" download="QR_Buffet.jpg">โหลดสลิป</a></Button></div>
                        <div className={styles.slipbtn}>
                            <label htmlFor="file-input" className={`${styles.file_input} ${buffetSelcted?.paymentStatus === buffetPaymentStatusEnum.CHECKING || buffetSelcted?.paymentStatus == buffetPaymentStatusEnum.PAID ? styles.disabled : ''}`} >
                                เลือกภาพสลิป
                            </label>
                            <input
                                style={{ display: 'none' }}
                                disabled={buffetSelcted?.paymentStatus == buffetPaymentStatusEnum.CHECKING || buffetSelcted?.paymentStatus == buffetPaymentStatusEnum.PAID}
                                id="file-input"
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className={`file-input ${buffetSelcted?.paymentStatus == buffetPaymentStatusEnum.CHECKING || buffetSelcted?.paymentStatus == buffetPaymentStatusEnum.PAID ? styles.disabled : ''}`}
                            />
                            <button
                                onClick={confirm}
                                disabled={!selectedFile || buffetSelcted?.paymentStatus != buffetPaymentStatusEnum.PENDING && buffetSelcted?.paymentStatus != buffetPaymentStatusEnum.REJECT}
                                className={`${styles.slip} ${selectedFile ? '' : styles.disabled} `}

                            >
                                {buffetSelcted?.paymentStatus == buffetPaymentStatusEnum.CHECKING ? 'ส่งสลิปแล้ว' : 'ส่งสลิป'}
                            </button>
                        </div>
                    </div>
                </Modal.Footer>
            </Modal>

            <SaleDetailModal
                show={showSaleDetailModal}
                onHide={handleCloseDetailModal}
                isSalesDataLoading={isSalesDataLoading}
                salesData={salesData}
            />


        </>

    );
};

export default Infobuffet;
