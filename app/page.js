"use client";
import { useState } from "react";
import { ethers } from "ethers";
import abiData from "./abi.json";

// Contract Address บน Sepolia Testnet
const CONTRACT_ADDRESS = "0xe18882d1fc3815a2980932af876b2095fcb6c27c";
const CONTRACT_CHAIN_ID = 11155111; // Sepolia Testnet Chain ID

export default function Home() {
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("0");
  const [unlockDate, setUnlockDate] = useState("-");
  const [rawUnlockTimestamp, setRawUnlockTimestamp] = useState(0);
  const [depositAmount, setDepositAmount] = useState("");
  const [unlockPicker, setUnlockPicker] = useState("");
  const [status, setStatus] = useState("กรุณาเชื่อมต่อกระเป๋าก่อนใช้งาน");

  // ฟังก์ชันเชื่อมต่อ MetaMask และสลับ Network ไปยัง Sepolia
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("กรุณาติดตั้ง MetaMask!");
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
    } catch (err) {
      console.error(err);
    }
  };

  // ฟังก์ชันฝากเงิน
  const handleDeposit = async () => {
    if (!depositAmount || !unlockPicker) {
      alert("กรุณากรอกจำนวนเงินและเลือกเวลาปลดล็อก");
      return;
    }

    const targetTimestamp = Math.floor(new Date(unlockPicker).getTime() / 1000);
    const currentTimestamp = Math.floor(Date.now() / 1000);

    // ตรวจสอบ: เวลาใหม่ต้องอยู่ในอนาคต
    if (targetTimestamp <= currentTimestamp) {
      alert("เวลาปลดล็อกต้องอยู่ในอนาคตเท่านั้น!");
      return;
    }

    // 🔒 ตรวจสอบฝั่ง Frontend ก่อนส่ง Gas: ป้องกันการขยับเวลาให้เร็วกว่าเดิม
    if (rawUnlockTimestamp > 0 && targetTimestamp < rawUnlockTimestamp) {
      const currentLockDate = new Date(rawUnlockTimestamp * 1000).toLocaleString("th-TH");
      alert(`เวลาปลดล็อกใหม่ต้องไม่เร็วกว่าเวลาปลดล็อกเดิมที่ตั้งไว้ (${currentLockDate})`);
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

  // รีเฟรชข้อมูล
  const handleRefresh = () => {
    if (account && window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      updateContractInfo(signer);
      setStatus("อัปเดตข้อมูลล่าสุดเรียบร้อย!");
    }
  };

  return (
    <div style={{ maxWidth: "450px", margin: "40px auto", padding: "20px", background: "#fff", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
      {!account ? (
        <button
          onClick={connectWallet}
          style={{ width: "100%", padding: "12px", backgroundColor: "#f6851b", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", marginBottom: "20px" }}
        >
          🦊 CONNECT METAMASK (SEPOLIA)
        </button>
      ) : (
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <div style={{ flex: 1, padding: "10px", backgroundColor: "#e8f5e9", color: "#2e7d32", borderRadius: "8px", fontWeight: "bold", fontSize: "14px", textAlign: "center" }}>
            เชื่อมต่อแล้ว: {account.substring(0, 6)}...{account.substring(38)}
          </div>
          <button
            onClick={disconnectWallet}
            style={{ padding: "10px 15px", backgroundColor: "#6c757d", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
          >
            ออกจากระบบ
          </button>
        </div>
      )}

      <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px", lineHeight: "1.8" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><strong>ยอดเงินในกระปุก:</strong> {balance} ETH</div>
          {account && (
            <button onClick={handleRefresh} style={{ border: "none", background: "none", cursor: "pointer", color: "#1976d2", fontSize: "12px" }}>
              🔄 รีเฟรช
            </button>
          )}
        </div>
        <div><strong>เวลาปลดล็อก:</strong> {unlockDate}</div>
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>จำนวนเงิน (ETH):</label>
        <input
          type="number"
          step="0.001"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          placeholder="0.01"
          style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
        />
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>เลือกเวลาปลดล็อก (ปฏิทิน):</label>
        <input
          type="datetime-local"
          value={unlockPicker}
          onChange={(e) => setUnlockPicker(e.target.value)}
          style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
        />
      </div>

      <button
        onClick={handleDeposit}
        disabled={!account}
        style={{ width: "100%", padding: "12px", backgroundColor: account ? "#28a745" : "#ccc", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: account ? "pointer" : "not-allowed", marginBottom: "10px" }}
      >
        📥 ฝากเงินเข้ากระปุก
      </button>

      <button
        onClick={handleWithdraw}
        disabled={!account}
        style={{ width: "100%", padding: "12px", backgroundColor: account ? "#dc3545" : "#ccc", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: account ? "pointer" : "not-allowed" }}
      >
        📤 ถอนเงินทั้งหมด
      </button>

      <div style={{ textAlign: "center", fontSize: "12px", color: "#666", marginTop: "15px" }}>{status}</div>
    </div>
  );
}