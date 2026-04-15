import React, { useState } from 'react';
import Image from 'next/image';
import styles from './styles/admin/AdminTopbar.module.css';

type TopBarProps = {
  toggleSidebar: () => void;
  isOpen: boolean;

};

const TopBar: React.FC<TopBarProps> = ({ toggleSidebar, isOpen }) => {
  return (
    <div className={styles.topBar}>
      <span className={`${styles.sidebarToggleIcon}  ${isOpen ? styles.active : ''} `} onClick={toggleSidebar}>
        <span className={styles.bar}></span>
        <span className={styles.bar}></span>
        <span className={styles.bar}></span>      </span>

      <div className={styles.logo}>
        <Image src="/logo.jpg" alt="Badminton Logo" width={40} height={40} />
      </div>
      <div className={styles.title}>Banpong Admin</div>
    </div>
  );
};

export default TopBar;
