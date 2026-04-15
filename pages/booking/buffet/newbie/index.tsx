import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '@/styles/ReserveForm.module.css';
import { utcToZonedTime } from 'date-fns-tz';
import { format, addDays, differenceInHours, } from 'date-fns';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { Button, Form } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { IsStudentEnum } from '@/enum/StudentPriceEnum';
import { IBuffet_setting } from '@/interface/buffetSetting';
import { skillLevelsOptions } from '@/constant/options/skillValueOptions';
import { SkillLevelEnum } from '@/enum/skillLevelEnum';
import useDebounce from '@/hook/use-debounce';
import { OptionType } from '@/components/admin/AbbreviatedSelect';
import { ShuttleCockTypes } from '@/pages/admin/backend/booking/buffet';
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

export default function Page({ buffetSetting, buffetStudentSetting, buffetUniversitySetting }: Props) {
  const router = useRouter();
  const dateInBangkok = utcToZonedTime(new Date(), "Asia/Bangkok");

  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [unique_nickname, setUnique_nickname] = useState(false)
  const [error, setError] = useState('');
  const [skillLevel, setSkillLevel] = useState<SkillLevelEnum | null>(null);
  const searchDebounce = useDebounce(nickname, 500)
  const [shuttleCockTypes, setShuttleCockTypes] = useState<OptionType[]>([]);

  const getShuttleCockTypes = async () => {
    try {
      const response = await fetch(`/api/buffet/newbie/get_shuttlecock_types`);
      if (response.ok) {
        const data = await response.json();
        const formattedData = data.map((item: ShuttleCockTypes) => ({
          id: item.id,
          label: `${item.name} - ${item.price}฿/ลูก (คนละ ${item.price / 4}฿)`,
          code: item.code,
          name: item.name,
          price: item.price,
        }));
        setShuttleCockTypes(formattedData);
      } else {
        console.error('Failed to fetch shuttlecock types.');
      }
    } catch (error) {
      console.error('Error occurred while fetching shuttlecock types:', error);
    }
  }

  useEffect(() => {
    getShuttleCockTypes()
  },[])

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError("")
    if (phone == '' || !nickname) {
      setError("กรุณากรอกฟิลให้ครบ")
      return;
    } else if (phone.length < 10) {
      setError("กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 ตัว")
      return;
    }
    else if (unique_nickname) {
      Swal.fire({
        icon: "error",
        title: "ชื่อนี้มีคนใช้แล้ว",
        text: "ชื่อซ้ำกรุณาเปลี่ยนชื่อ",
      });
      return;
    }
    else if (!skillLevel) {
      Swal.fire({
        icon: "error",
        title: "กรุณาระบุระดับมือ",
      });
      return;
    }
    else {
      Swal.fire({
        title: 'กำลังบันทึก...',
        text: 'โปรดอย่าปิดหน้านี้',
        timerProgressBar: true,
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      try {
        const formData = new FormData();
        formData.append('nickname', nickname);
        formData.append('usedate', format(dateInBangkok, 'dd MMMM yyyy'));
        formData.append('phone', phone);
        formData.append('isStudent', isStudent.toString());
        formData.append('skillLevel', skillLevel);

        const response = await fetch('/api/buffet/newbie/add', {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();

          Swal.fire({
            title: `บันทึกสำเร็จ รหัสของท่านคือ ${data.barcode.barcode}`,
            icon: 'success',
            text: "ต้องการไปหน้ารายละเอียดไหม ? ",
            showCancelButton: true,
            confirmButtonText: "ตกลง",
          }).then((result) => {
            /* Read more about isConfirmed, isDenied below */
            if (result.isConfirmed) {
              router.replace("/booking/buffet/newbie/info")
            }
          });
          setPhone('');
          setNickname('');
          setIsStudent(IsStudentEnum.None)
        } else {
          // ถ้ามีข้อผิดพลาดในการอัปโหลด แสดง SweetAlert2 ข้อความข้อผิดพลาด
          Swal.fire({
            title: 'เกิดข้อผิดพลาดในการอัปโหลด',
            text: 'โปรดลองใหม่อีกครั้ง',
            icon: 'error',
          });
        }
      } catch (error) {
        // ถ้าเกิดข้อผิดพลาดในการทำงาน
        Swal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: 'โปรดลองใหม่อีกครั้ง',
          icon: 'error',
        });
        console.error('Error:', error);
      }

    }
  };

  const nick_name_check = async () => {
    const response = await fetch(`/api/buffet/newbie/check_nick_name?nickname=${searchDebounce}&usedate=${format(dateInBangkok, 'dd MMMM yyyy')}`);
    const jsonData = await response.json();

    if (jsonData.length > 0) {
      if (jsonData[0].nickname == searchDebounce) {
        setError("ชื่อเล่นมีผู้ใช้แล้วโปรดเปลี่ยนชื่อ")
        setUnique_nickname(true)
      } else {
        setError('')
        setUnique_nickname(false)
      }
    } else {
      setError('')
      setUnique_nickname(false)
    }

  }
  useEffect(() => {
    nick_name_check()
  }, [searchDebounce])


  const [isStudent, setIsStudent] = useState(IsStudentEnum.None);
  const [price, setPrice] = useState(buffetSetting.court_price);

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = (event.target.value) as IsStudentEnum;
    setIsStudent(value === isStudent ? IsStudentEnum.None : value);
    setPrice(value === IsStudentEnum.Student ? buffetStudentSetting.court_price : value === IsStudentEnum.University ? buffetUniversitySetting.court_price : buffetSetting.court_price);
  };


  return (
    <div className={styles['reserve-form-container']}>
      <Head>
        <title>จองตีบุฟเฟ่ต์</title>
      </Head>
      <h2>จองตีบุฟเฟ่ต์</h2>
      <h2 style={{ color: 'red' }}>วันใช้งาน {format(dateInBangkok, 'dd MMMM yyyy')}</h2>
      <br />

      <form onSubmit={handleSubmit}>
        <label>
          ชื่อเล่น:
          <input
            type="text"
            maxLength={10}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder='ชื่อเล่น'
            required
          />
        </label>
        <label>
          เบอร์โทร:
          <input
            type="tel"
            maxLength={10}
            pattern="0[0-9]{9}"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder='เบอร์โทร'
            required
          />
        </label>
        <Form.Group controlId="skillLevelSelect">
          <Form.Label>ระดับมือ:</Form.Label>
          <Form.Select
            value={skillLevel || ""}
            onChange={(e) => setSkillLevel(e.target.value as SkillLevelEnum)}
            aria-label="Select an option"
            required
          >
            <option value="" disabled>
              เลือกระดับมือ
            </option>
            {skillLevelsOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.value})
              </option>
            ))}
          </Form.Select>

        </Form.Group>

        <div className={`${styles.checkbox_wrapper} d-flex mt-3`}>
          <input
            type="checkbox"
            id="cbtest-19-1"
            value={IsStudentEnum.Student}
            onChange={handleCheckboxChange}
            checked={isStudent === IsStudentEnum.Student}
          />
          <label htmlFor="cbtest-19-1" className={styles.check_box}></label>
          <p className="mx-2" style={{ padding: '0' }}>นักเรียน | {buffetStudentSetting.court_price} บาท</p>
        </div>

        <div className={`${styles.checkbox_wrapper} d-flex`}>
          <input
            type="checkbox"
            id="cbtest-19-2"
            value={IsStudentEnum.University}
            onChange={handleCheckboxChange}
            checked={isStudent === IsStudentEnum.University}
          />
          <label htmlFor="cbtest-19-2" className={styles.check_box}></label>
          <p className="mx-2" style={{ padding: '0' }}>นักศึกษา | {buffetUniversitySetting.court_price} บาท</p>
        </div>

        {error && (
          <div>
            <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>
          </div>
        )}

        <div className="pricing-section mb-3">
          <div className="price-card bg-white shadow-sm rounded p-2 mb-2">
            <div className="d-flex justify-content-between align-items-center">
              <span className="">ค่าตีก๊วน</span>
              <span className="badge bg-light text-primary rounded-pill">
                {isStudent === IsStudentEnum.None ? buffetSetting.court_price : price} บาท/คน
              </span>
            </div>
          </div>

          <div className="price-card bg-white shadow-sm rounded p-2">
            <span className="d-block mb-2">ค่าลูกแบด</span>
            <div className="shuttlecock-list">
              {shuttleCockTypes.map((shuttleCockType) => (
                <div key={shuttleCockType.id} className="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
                  <small>{shuttleCockType.name}</small>
                  <div className="text-end">
                    <span className="text-primary badge bg-light text-primary rounded-pill">{Number(shuttleCockType.price) / 4} บาท/คน</span>
                    <small className="text-muted d-block">(ลูกละ {Number(shuttleCockType.price)} บาท)</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className='row'>
          <Button className='col mx-2' type="submit">ยืนยันการจอง</Button>
        </div>
      </form>
    </div>
  );

}
