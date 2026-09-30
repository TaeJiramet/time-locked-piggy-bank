"use client";
import { useState } from "react";
import { ethers } from "ethers";
import abiData from "./abi.json";
import TimeSelect from "./TimeSelect";

// Contract Address บน Sepolia Testnet
const CONTRACT_ADDRESS = "0xe18882d1fc3815a2980932af876b2095fcb6c27c";
const CONTRACT_CHAIN_ID = 11155111; // Sepolia Testnet Chain ID

// กำหนดสไตล์ของสถานะจากข้อความ
const getStatusTone = (text) => {
  if (/ผิดพลาด|ไม่สำเร็จ|ล้มเหลว/.test(text)) return "error";
  if (/กำลัง/.test(text)) return "pending";
  if (/สำเร็จ|เรียบร้อย/.test(text)) return "success";
  return "neutral";
};

// แปลงค่า yyyy-MM-dd เป็นรูปแบบไทย: วัน/เดือน/ปี พ.ศ.
const formatThaiDate = (v) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "วัน / เดือน / ปี พ.ศ.";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${Number(y) + 543}`;
};

// ตัวเลือกเวลาแบบ 24 ชั่วโมง (ไม่ใช้ AM/PM)
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0")
);
// เลือกห่างกันครั้งละ 5 นาที (12 ตัวเลือก ไม่ต้องเลื่อนยาว)
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0")
);

export default function Home() {
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("0");
  const [unlockDate, setUnlockDate] = useState("-");
  const [rawUnlockTimestamp, setRawUnlockTimestamp] = useState(0);
  const [depositAmount, setDepositAmount] = useState("");
  const [unlockPicker, setUnlockPicker] = useState("");
  const [status, setStatus] = useState("กรุณาเชื่อมต่อกระเป๋าก่อนใช้งาน");
  const [refreshing, setRefreshing] = useState(false);
  const [flashKey, setFlashKey] = useState(0);

  // แยกค่าจาก unlockPicker (yyyy-MM-ddTHH:mm) มาแสดงในช่องวันที่ + dropdown เวลา
  const pickDate = unlockPicker ? unlockPicker.split("T")[0] : "";
  const pickTime = unlockPicker ? unlockPicker.split("T")[1] || "" : "";
  const pickHour = pickTime.slice(0, 2);
  const pickMinute = pickTime.slice(3, 5);
  const _now = new Date();
  const todayIso = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;

  const handlePickDate = (e) => {
    const d = e.target.value;
    // ยังไม่เคยเลือกเวลา → ตั้งค่าเริ่มต้น 23:55 (ใกล้ท้ายวัน และอยู่ในตัวเลือกทุก 5 นาที)
    setUnlockPicker(d ? `${d}T${pickTime || "23:55"}` : "");
  };

  const handlePickHour = (v) => {
    if (!pickDate) return;
    setUnlockPicker(`${pickDate}T${v}:${pickMinute || "00"}`);
  };

  const handlePickMinute = (v) => {
    if (!pickDate) return;
    setUnlockPicker(`${pickDate}T${pickHour || "00"}:${v}`);
  };

  // ฟังก์ชันเชื่อมต่อ MetaMask และสลับ Network ไปยัง Sepolia
  const connectWallet = async () => {
    if (!window.ethereum) {
      setStatus("กรุณาติดตั้ง MetaMask ก่อนใช้งาน!");
      return;
    }

    try {
      const hexChainId = "0x" + CONTRACT_CHAIN_ID.toString(16);
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: hexChainId }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: hexChainId,
                chainName: "Sepolia Test Network",
                rpcUrls: ["https://rpc.sepolia.org"],
                nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
        }
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();

      setAccount(address);
      setStatus("เชื่อมต่อ Sepolia สำเร็จ!");
      updateContractInfo(signer);
    } catch (err) {
      console.error(err);
      setStatus("การเชื่อมต่อล้มเหลว หรือปฏิเสธการเปลี่ยน Network");
    }
  };

  // ฟังก์ชันออกจากระบบ
  const disconnectWallet = () => {
    setAccount("");
    setBalance("0");
    setUnlockDate("-");
    setRawUnlockTimestamp(0);
    setDepositAmount("");
    setUnlockPicker("");
    setStatus("ยกเลิกการเชื่อมต่อแล้ว");
  };

  // ดึงข้อมูลยอดเงินและเวลาปลดล็อกล่าสุดจาก Smart Contract
  const updateContractInfo = async (signer) => {
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abiData, signer);

      // 1. ดึงยอดเงินในกระปุก
      try {
        const bal = await contract.getBalance();
        setBalance(ethers.utils.formatEther(bal));
      } catch (e) {
        const provider = signer.provider;
        const rawBal = await provider.getBalance(CONTRACT_ADDRESS);
        setBalance(ethers.utils.formatEther(rawBal));
      }

      // 2. ดึงเวลาปลดล็อก
      try {
        const unlock = await contract.unlockTime();
        const unlockNum = unlock.toNumber();
        setRawUnlockTimestamp(unlockNum);

        if (unlockNum > 0) {
          const date = new Date(unlockNum * 1000);
          setUnlockDate(date.toLocaleString("th-TH"));
        } else {
          setUnlockDate("ยังไม่มีการตั้งเวลา");
        }
      } catch (e) {
        setUnlockDate("ไม่สามารถดึงเวลาปลดล็อกได้");
      }

      // ข้อมูลอัปเดตแล้ว → สั่งเอฟเฟกต์แสง/ตัวเลขเด้ง
      setFlashKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      return false;
    }
    return true;
  };

  // ฟังก์ชันฝากเงิน
  const handleDeposit = async () => {
    if (!depositAmount || !unlockPicker) {
      setStatus("กรุณากรอกจำนวนเงินและเลือกเวลาปลดล็อก");
      return;
    }

    const targetTimestamp = Math.floor(new Date(unlockPicker).getTime() / 1000);
    const currentTimestamp = Math.floor(Date.now() / 1000);

    // ตรวจสอบ: เวลาใหม่ต้องอยู่ในอนาคต
    if (targetTimestamp <= currentTimestamp) {
      setStatus("เวลาปลดล็อกต้องอยู่ในอนาคตเท่านั้น!");
      return;
    }

    // 🔒 ตรวจสอบฝั่ง Frontend ก่อนส่ง Gas: ป้องกันการขยับเวลาให้เร็วกว่าเดิม
    if (rawUnlockTimestamp > 0 && targetTimestamp < rawUnlockTimestamp) {
      const currentLockDate = new Date(rawUnlockTimestamp * 1000).toLocaleString("th-TH");
      setStatus(`เวลาปลดล็อกใหม่ต้องไม่เร็วกว่าเวลาปลดล็อกเดิมที่ตั้งไว้ (${currentLockDate})`);
      return;
    }

    try {
      setStatus("กำลังส่งธุรกรรมฝากเงิน...");
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abiData, signer);

      const tx = await contract.deposit(targetTimestamp, {
        value: ethers.utils.parseEther(depositAmount),
      });

      setStatus("กำลังรอยืนยันธุรกรรมบน Sepolia...");
      await tx.wait();
      setStatus("ฝากเงินสำเร็จเรียบร้อย!");
      updateContractInfo(signer);
    } catch (err) {
      console.error(err);
      setStatus("เกิดข้อผิดพลาดในการฝากเงิน (โปรดตรวจสอบเงื่อนไขเวลา หรือค่า Gas)");
    }
  };

  // ฟังก์ชันถอนเงิน
  const handleWithdraw = async () => {
    try {
      setStatus("กำลังส่งคำขอถอนเงิน...");
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abiData, signer);

      const tx = await contract.withdraw();
      setStatus("กำลังรอยืนยันการถอน...");
      await tx.wait();

      setStatus("ถอนเงินสำเร็จเรียบร้อย!");
      updateContractInfo(signer);
    } catch (err) {
      console.error(err);
      setStatus("ถอนเงินไม่สำเร็จ (ยังไม่ถึงเวลา หรือไม่ใช่ Owner)");
    }
  };

  // รีเฟรชข้อมูล (มีสถานะโหลดให้เห็นชัดว่ากำลัง/เสร็จแล้ว)
  const handleRefresh = async () => {
    if (!account || !window.ethereum || refreshing) return;

    setRefreshing(true);
    setStatus("กำลังดึงข้อมูลล่าสุด...");
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const ok = await updateContractInfo(signer);
      setStatus(
        ok ? "อัปเดตข้อมูลล่าสุดเรียบร้อย!" : "รีเฟรชไม่สำเร็จ กรุณาลองใหม่"
      );
    } catch (err) {
      console.error(err);
      setStatus("รีเฟรชไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setRefreshing(false);
    }
  };

  const tone = getStatusTone(status);
  const shortAddress = account
    ? `${account.substring(0, 6)}...${account.substring(38)}`
    : "";

  return (
    <div className="wallet-card">
      {!account ? (
        <button className="btn btn-connect" onClick={connectWallet}>
          <span className="main">🦊 เชื่อมต่อ MetaMask</span>
          <span className="sub">SEPOLIA TESTNET</span>
        </button>
      ) : (
        <div className="wallet-row">
          <span className="wallet-chip">
            <span className="pulse-dot" />
            <span className="addr">{shortAddress}</span>
            <span className="chip-label">เชื่อมต่อแล้ว</span>
          </span>
          <button className="btn btn-ghost" onClick={disconnectWallet}>
            ออกจากระบบ
          </button>
        </div>
      )}

      <section className={`balance-card${refreshing ? " is-loading" : ""}`}>
        <span className="shine" key={`shine-${flashKey}`} aria-hidden="true" />
        <div className="balance-top">
          <span className="eyebrow">🏦 ยอดเงินในกระปุก</span>
          {account && (
            <button
              className={`refresh-btn${refreshing ? " is-loading" : ""}`}
              onClick={handleRefresh}
              disabled={refreshing}
              aria-busy={refreshing}
              title="ดึงข้อมูลล่าสุดจากสัญญา"
            >
              <span className="refresh-ico" aria-hidden="true">
                ⟳
              </span>
              รีเฟรช
            </button>
          )}
        </div>
        <div className="balance-amount">
          <span className="num" key={flashKey}>
            {balance}
          </span>
          <span className="ticker">ETH</span>
        </div>
        <div className="unlock-row">
          <span className="unlock-k">🔒 เวลาปลดล็อก</span>
          <span className="unlock-v">{unlockDate}</span>
        </div>
      </section>

      <div className="form-section">
        <div className="field">
          <label htmlFor="amount">จำนวนเงิน (ETH)</label>
          <div className="input-wrap">
            <input
              id="amount"
              className="input"
              type="number"
              step="0.001"
              min="0"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="0.01"
            />
            <span className="suffix">ETH</span>
          </div>
        </div>

        <div className="field">
          <label htmlFor="unlock">เลือกวันที่และเวลาปลดล็อก</label>
          <div className="time-row">
            <div className="input-wrap">
              <input
                id="unlock"
                className="input dt-input"
                type="date"
                min={todayIso}
                value={pickDate}
                onChange={handlePickDate}
              />
              <span
                className={`dt-mask${pickDate ? "" : " dt-mask--empty"}`}
                aria-hidden="true"
              >
                {formatThaiDate(pickDate)}
              </span>
            </div>

            <TimeSelect
              label="ชั่วโมง"
              value={pickHour || "23"}
              options={HOUR_OPTIONS}
              disabled={!pickDate}
              onChange={handlePickHour}
            />

            <span className="time-colon">:</span>

            <TimeSelect
              label="นาที"
              value={pickMinute || "55"}
              options={MINUTE_OPTIONS}
              disabled={!pickDate}
              onChange={handlePickMinute}
            />
          </div>
        </div>
      </div>

      <div className="actions">
        <button
          className="btn btn-deposit"
          onClick={handleDeposit}
          disabled={!account}
        >
          📥 ฝากเงินเข้ากระปุก
        </button>

        <button
          className="btn btn-withdraw"
          onClick={handleWithdraw}
          disabled={!account}
        >
          📤 ถอนเงินทั้งหมด
        </button>
      </div>

      <div className={`status status--${tone}`} role="status">
        {tone === "pending" && <span className="spinner" aria-hidden="true" />}
        <span>{status}</span>
      </div>

      <p className="card-foot">
        🔒 เงินถูกล็อกใน Smart Contract จนกว่าจะถึงเวลาที่กำหนด
        <br />
        ทำธุรกรรมบน Ethereum Sepolia Testnet เท่านั้น
      </p>
    </div>
  );
}
