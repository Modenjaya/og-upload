// Bagian 1 dari 4 (Dimodifikasi ke ES Module penuh dan import ethers secara keseluruhan)
// Hapus `require` dan ganti dengan `import` untuk semua modul
import * as ethers from 'ethers'; // IMPOR SEMUA DARI ETHERS SEBAGAI NAMESPACE
import axios from 'axios';
import readline from 'readline';
import crypto from 'crypto'; // Menggunakan modul crypto bawaan Node.js
import fs from 'fs';
import path from 'path'; // Digunakan untuk path file
import { HttpsProxyAgent } from 'https-proxy-agent';
import { fileURLToPath } from 'url'; // Untuk __filename dan __dirname di ES Module
// SDK 0G Labs
import { ZgFile, Indexer } from '@0glabs/0g-ts-sdk';


// === Konstanta & Logger ===
const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  bold: "\x1b[1m"
};

const logger = {
  info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  process: (msg) => console.log(`\n${colors.white}[➤] ${msg}${colors.reset}`),
  debug: (msg) => console.log(`${colors.gray}[…] ${msg}${colors.reset}`),
  bye: (msg) => console.log(`${colors.yellow}[…] ${msg}${colors.reset}`),
  critical: (msg) => console.log(`${colors.red}${colors.bold}[❌] ${msg}${colors.reset}`),
  summary: (msg) => console.log(`${colors.white}[✓] ${msg}${colors.reset}`),
  section: (msg) => {
    const line = '='.repeat(50);
    console.log(`\n${colors.cyan}${line}${colors.reset}`);
    if (msg) console.log(`${colors.cyan}${msg}${colors.reset}`);
    console.log(`${colors.cyan}${line}${colors.reset}\n`);
  },
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log(`---------------------------------------------`);
    console.log(`<><><><><>< 0G upload file Tool ><><><><><><>`);
    console.log(`---------------------------------------------${colors.reset}\n`);
  }
};

const CHAIN_ID = 16601;
const RPC_URL = 'https://evmrpc-testnet.0g.ai';
const CONTRACT_ADDRESS = '0xbD75117F80b4E22698D0Cd7612d92BDb8eaff628'; // Alamat kontrak yang diperbarui
const METHOD_ID = '0xef3e12dc'; // Fungsi 'store(bytes32,uint64)'
const PROXY_FILE = 'proxy.txt';
const PRIVATE_KEYS_FILE = 'private_keys.txt';
const INDEXER_URL = 'https://indexer-storage-testnet-turbo.0g.ai';
const EXPLORER_URL = 'https://chainscan-galileo.0g.ai/tx/';

const IMAGE_SOURCES = [
  { url: 'https://picsum.photos/800/600', responseType: 'arraybuffer' },
  { url: 'https://loremflickr.com/800/600', responseType: 'arraybuffer' }
];

let privateKeys = [];
let currentKeyIndex = 0;

const provider = new ethers.JsonRpcProvider(RPC_URL); // Menggunakan ethers.JsonRpcProvider dari import

// Untuk __filename dan __dirname di ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GENERATED_DIR = path.join(__dirname, 'generated-files');

// Pastikan folder exists
if (!fs.existsSync(GENERATED_DIR)) {
  fs.mkdirSync(GENERATED_DIR);
}


// Bagian 2 dari 4 (Dimodifikasi)

function loadPrivateKeys() {
  try {
    if (!fs.existsSync(PRIVATE_KEYS_FILE)) {
      logger.critical(`Private keys file not found: ${PRIVATE_KEYS_FILE}`);
      process.exit(1);
    }

    const data = fs.readFileSync(PRIVATE_KEYS_FILE, 'utf8');
    privateKeys = data.split('\n')
      .map(key => key.trim())
      .filter(key => key && isValidPrivateKey(key));

    if (privateKeys.length === 0) {
      logger.critical(`No valid private keys found in ${PRIVATE_KEYS_FILE}`);
      process.exit(1);
    }

    logger.success(`Loaded ${privateKeys.length} private key(s) from ${PRIVATE_KEYS_FILE}`);
  } catch (error) {
    logger.critical(`Failed to load private keys: ${error.message}`);
    process.exit(1);
  }
}

function isValidPrivateKey(key) {
  key = key.trim();
  if (!key.startsWith('0x')) key = '0x' + key;
  try {
    new ethers.Wallet(key); // Menggunakan ethers.Wallet dari import
    return key.length === 66; // Private key hex string selalu 66 karakter (0x + 64 hex)
  } catch (error) {
    return false;
  }
}

function getNextPrivateKey() {
  return privateKeys[currentKeyIndex];
}

function rotatePrivateKey() {
  currentKeyIndex = (currentKeyIndex + 1) % privateKeys.length;
  return privateKeys[currentKeyIndex];
}

function getRandomUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) Gecko/20100101 Firefox/124.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/122.0.6261.89 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.119 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.119 Mobile Safari/537.36'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

let proxies = [];
let currentProxyIndex = 0;

function loadProxies() {
  try {
    if (fs.existsSync(PROXY_FILE)) {
      const data = fs.readFileSync(PROXY_FILE, 'utf8');
      proxies = data.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));

      if (proxies.length > 0) {
        logger.info(`Loaded ${proxies.length} proxies from ${PROXY_FILE}`);
      } else {
        logger.warn(`No proxies found in ${PROXY_FILE}`);
      }
    } else {
      logger.warn(`Proxy file ${PROXY_FILE} not found`);
    }
  } catch (error) {
    logger.error(`Failed to load proxies: ${error.message}`);
  }
}

function getNextProxy() {
  if (proxies.length === 0) return null;
  const proxy = proxies[currentProxyIndex];
  currentProxyIndex = (currentProxyIndex + 1) % proxies.length;
  return proxy;
}

function extractProxyIP(proxy) {
  try {
    let cleanProxy = proxy.replace(/^https?:\/\//, '').replace(/.*@/, '');
    const ip = cleanProxy.split(':')[0];
    return ip || cleanProxy;
  } catch (error) {
    return proxy; 
  }
}

function createAxiosInstance() {
  const config = {
    headers: {
      'User-Agent': getRandomUserAgent(),
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.8',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'sec-gpc': '1',
      'Referer': 'https://storagescan-galileo.0g.ai/',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  };

  const proxy = getNextProxy();
  if (proxy) {
    const proxyIP = extractProxyIP(proxy);
    logger.debug(`Using proxy IP: ${proxyIP}`);
    config.httpsAgent = new HttpsProxyAgent(proxy);
  }

  return axios.create(config);
} 

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function initializeWallet(privateKey) { // Menerima private key sebagai argumen
  return new ethers.Wallet(privateKey, provider); // Menggunakan ethers.Wallet dari import
}
// Bagian 3 dari 4

async function checkNetworkSync() {
  try {
    logger.loading('Checking network sync...');
    const blockNumber = await provider.getBlockNumber();
    logger.success(`Network synced at block ${blockNumber}`);
    return true;
  } catch (error) {
    logger.error(`Network sync check failed: ${error.message}`);
    return false;
  }
}

async function fetchRandomImage() {
  try {
    logger.loading('Fetching random image...');
    const axiosInstance = createAxiosInstance();
    const source = IMAGE_SOURCES[Math.floor(Math.random() * IMAGE_SOURCES.length)];
    const response = await axiosInstance.get(source.url, {
      responseType: source.responseType,
      maxRedirects: 5
    });
    logger.success('Image fetched successfully');
    return response.data;
  } catch (error) {
    logger.error(`Error fetching image: ${error.message}`);
    throw error;
  }
}

async function checkFileExists(fileHash) {
  try {
    logger.loading(`Checking file hash ${fileHash}...`);
    const axiosInstance = createAxiosInstance();
    const response = await axiosInstance.get(`${INDEXER_URL}/file/info/${fileHash}`);
    // Perbaikan: response.data.data mungkin null atau tidak ada exists, cek lebih hati-hati
    return response.data && response.data.code === 0 && response.data.data && response.data.data.finalized === true;
  } catch (error) {
    logger.warn(`Failed to check file hash: ${error.message}`);
    return false;
  }
}

async function prepareImageData(imageBuffer) {
  const MAX_HASH_ATTEMPTS = 5;
  let attempt = 1;

  while (attempt <= MAX_HASH_ATTEMPTS) {
    try {
      const hash = '0x' + crypto.createHash('sha256').update(imageBuffer).digest('hex');
      
      const fileExists = await checkFileExists(hash);
      if (fileExists) {
        logger.warn(`Hash ${hash} already exists (finalized), retrying with new image...`);
        attempt++;
        // Jika hash duplikat, kita perlu mendapatkan gambar baru untuk mencoba lagi
        imageBuffer = await fetchRandomImage(); // Ambil gambar baru di sini
        continue;
      }
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');
      logger.success(`Generated unique file hash: ${hash}`);
      return {
        root: hash,
        data: imageBase64,
        size: imageBuffer.length // Tambahkan ukuran file
      };
    } catch (error) {
      logger.error(`Error generating hash or checking existence (attempt ${attempt}): ${error.message}`);
      attempt++;
      if (attempt > MAX_HASH_ATTEMPTS) {
        throw new Error(`Failed to generate unique hash after ${MAX_HASH_ATTEMPTS} attempts`);
      }
    }
  }
}
// Bagian 4 dari 4 (Dimodifikasi)

async function uploadToStorage(imageData, imageBuffer, wallet, walletIndex) { // Tambah imageBuffer sebagai argumen
  const MAX_RETRIES = 3;
  const TIMEOUT_SECONDS = 300;
  let attempt = 1;

  logger.loading(`Checking wallet balance for ${wallet.address}...`);
  const balance = await provider.getBalance(wallet.address);
  const minBalance = ethers.parseEther('0.0015'); // Minimum saldo untuk biaya gas + biaya penyimpanan
  
  if (BigInt(balance) < BigInt(minBalance)) {
    throw new Error(`Insufficient balance: ${ethers.formatEther(balance)} OG (required >${ethers.formatEther(minBalance)} OG)`);
  }
  logger.success(`Wallet balance: ${ethers.formatEther(balance)} OG`);

  while (attempt <= MAX_RETRIES) {
    try {
      logger.loading(`Uploading file segment for wallet #${walletIndex + 1} [${wallet.address}] (Attempt ${attempt}/${MAX_RETRIES})...`);
      const axiosInstance = createAxiosInstance();
      
      // Payload untuk /file/segment sudah benar
      await axiosInstance.post(`${INDEXER_URL}/file/segment`, {
        root: imageData.root,
        index: 0,
        data: imageData.data, // Ini adalah Base64 dari gambar
        proof: {
          siblings: [imageData.root], // Untuk segmen tunggal, siblings adalah root itu sendiri
          path: []
        }
      }, {
        headers: {
          'content-type': 'application/json'
        }
      });
      logger.success('File segment uploaded');

      // Bentuk 'data' untuk transaksi kontrak store()
      // Menggunakan AbiCoder untuk encoding parameter bytes32 dan uint64
      const iface = new ethers.Interface([`function store(bytes32 _root, uint64 _dataSize)`]);
      const data = iface.encodeFunctionData("store", [
        imageData.root,         // bytes32 _root
        BigInt(imageBuffer.length) // uint64 _dataSize (gunakan BigInt untuk angka besar)
      ]);
      
      // Nilai (value) untuk transaksi, berdasarkan analisis tx sebelumnya (0x4e1003b28d10)
      // Ini adalah biaya on-chain untuk pendaftaran penyimpanan
      const value = ethers.parseEther('0.000839233398436224'); // Pastikan ini konsisten dengan biaya saat ini
      const feeData = await provider.getFeeData(); // Menggunakan getFeeData() di ethers v6
      const gasPrice = feeData.gasPrice; // Ekstrak gasPrice

      logger.loading('Estimating gas...');
      let gasLimit;
      try {
        const gasEstimate = await provider.estimateGas({
          to: CONTRACT_ADDRESS,
          data,
          from: wallet.address,
          value
        });
        gasLimit = (BigInt(gasEstimate) * 15n) / 10n; // Tambah 50% buffer
        logger.success(`Gas limit set: ${gasLimit}`);
      } catch (error) {
        gasLimit = 300000n; // Default gas limit sebagai BigInt
        logger.warn(`Gas estimation failed, using default: ${gasLimit}. Error: ${error.message}`);
      }

      const gasCost = BigInt(gasPrice) * gasLimit;
      const requiredBalance = gasCost + BigInt(value);
      if (BigInt(balance) < requiredBalance) {
        throw new Error(`Insufficient balance for transaction: ${ethers.formatEther(balance)} OG (required ~${ethers.formatEther(requiredBalance)} OG)`);
      }

      logger.loading('Sending transaction...');
      const nonce = await provider.getTransactionCount(wallet.address, 'latest');
      const txParams = {
        to: CONTRACT_ADDRESS,
        data,
        value,
        nonce,
        chainId: CHAIN_ID,
        gasPrice,
        gasLimit
      };

      const tx = await wallet.sendTransaction(txParams);
      const txLink = `${EXPLORER_URL}${tx.hash}`;
      logger.info(`Transaction sent: ${tx.hash}`);
      logger.info(`Explorer: ${txLink}`);

      logger.loading(`Waiting for confirmation (${TIMEOUT_SECONDS}s)...`);
      const startTime = Date.now();
      let delayMs = 2000;
      let receipt = null;

      while ((Date.now() - startTime) < TIMEOUT_SECONDS * 1000) {
        try {
          receipt = await provider.getTransactionReceipt(tx.hash);
          if (receipt && receipt.blockNumber) {
            logger.success(`Transaction confirmed in block ${receipt.blockNumber}`);
            break;
          }
        } catch (e) {
          if (e.code === -32005 || (e.message && e.message.includes("rate"))) {
            logger.warn(`Rate limited or temporary error fetching receipt, retrying after ${delayMs}ms...`);
          } else {
            logger.error(`Receipt error: ${e.message}`);
          }
        }

        await new Promise(r => setTimeout(r, delayMs));
        delayMs = Math.min(delayMs * 1.5, 30000);
      }

      if (!receipt || !receipt.blockNumber) {
        throw new Error(`Transaction not confirmed within timeout: ${txLink}`);
      }

      if (receipt.status !== 1) {
        throw new Error(`Transaction failed (status: ${receipt.status}): ${txLink}`);
      }

      logger.success(`File uploaded, root hash: ${imageData.root}`);
      return receipt;

    } catch (error) {
      logger.error(`Upload attempt ${attempt} failed: ${error.message}`);
      if (attempt < MAX_RETRIES) {
        const retryDelay = 10 + Math.random() * 20;
        logger.warn(`Retrying after ${retryDelay.toFixed(2)}s...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * 1000));
        attempt++;
        continue;
      }
      throw error;
    }
  }
}

async function main() {
  try {
    logger.banner();
    loadPrivateKeys(); // Memuat dari private_keys.txt
    loadProxies();

    logger.loading('Checking network status...');
    const network = await provider.getNetwork();
    if (BigInt(network.chainId) !== BigInt(CHAIN_ID)) {
      throw new Error(`Invalid chainId: expected ${CHAIN_ID}, got ${network.chainId}`);
    }
    logger.success(`Connected to network: chainId ${network.chainId}`);

    const isNetworkSynced = await checkNetworkSync();
    if (!isNetworkSynced) {
      throw new Error('Network is not synced');
    }

    console.log(colors.cyan + "Available wallets:" + colors.reset);
    privateKeys.forEach((key, index) => {
      const wallet = initializeWallet(key); // Inisialisasi Wallet dengan PK dari array
      console.log(`${colors.green}[${index + 1}]${colors.reset} ${wallet.address}`);
    });
    console.log();

    // Menggunakan async/await untuk rl.question
    const countInput = await new Promise(resolve => {
      rl.question('How many files to upload per wallet? ', resolve);
    });
    let count = parseInt(countInput);

    if (isNaN(count) || count <= 0) {
      logger.error('Invalid number. Please enter a number greater than 0.');
      rl.close();
      process.exit(1);
      return;
    }

    const totalUploads = count * privateKeys.length;
    logger.info(`Starting ${totalUploads} uploads (${count} per wallet)`);

    let successful = 0;
    let failed = 0;

    // Loop melalui setiap private key
    for (let walletIndex = 0; walletIndex < privateKeys.length; walletIndex++) {
      currentKeyIndex = walletIndex; // Set index kunci saat ini
      const wallet = initializeWallet(privateKeys[walletIndex]); // Inisialisasi wallet dengan PK dari array
      logger.section(`Processing Wallet #${walletIndex + 1} [${wallet.address}]`);

      // Periksa saldo di awal pemrosesan setiap wallet
      try {
        const balance = await provider.getBalance(wallet.address);
        const minBalanceThreshold = ethers.parseEther('0.0015'); // Ambang batas minimum
        if (BigInt(balance) < BigInt(minBalanceThreshold)) {
          logger.warn(`Wallet ${wallet.address} memiliki saldo rendah (${ethers.formatEther(balance)} OG). Melewatkan wallet ini.`);
          continue; // Lanjut ke wallet berikutnya
        }
        logger.info(`Wallet ${wallet.address} memiliki saldo cukup: ${ethers.formatEther(balance)} OG`);
      } catch (balanceError) {
        logger.error(`Failed to check balance for ${wallet.address}: ${balanceError.message}. Skipping wallet.`);
        continue;
      }

      for (let i = 1; i <= count; i++) {
        const uploadNumber = (walletIndex * count) + i;
        logger.process(`Upload ${uploadNumber}/${totalUploads} (Wallet #${walletIndex + 1}, File #${i})`);

        try {
          const imageBuffer = await fetchRandomImage(); // Dapatkan buffer gambar
          const imageData = await prepareImageData(imageBuffer); // Hasilnya mengandung root, data base64, dan size
          await uploadToStorage(imageData, imageBuffer, wallet, walletIndex); // Kirim imageBuffer juga
          successful++;
          logger.success(`Upload ${uploadNumber} completed`);

          if (uploadNumber < totalUploads) {
            logger.loading('Waiting for next upload...');
            await delay(3000); // Delay antar upload untuk satu wallet
          }
        } catch (error) {
          failed++;
          logger.error(`Upload ${uploadNumber} failed: ${error.message}`);
          await delay(5000); // Delay jika ada error
        }
      }

      if (walletIndex < privateKeys.length - 1) {
        logger.loading('Switching to next wallet...');
        await delay(10000); // Delay antar wallet
      }
    }

    logger.section('Upload Summary');
    logger.summary(`Total wallets: ${privateKeys.length}`);
    logger.summary(`Uploads per wallet: ${count}`);
    logger.summary(`Total attempted: ${totalUploads}`);
    if (successful > 0) logger.success(`Successful: ${successful}`);
    if (failed > 0) logger.error(`Failed: ${failed}`);
    logger.success('All operations completed');

    rl.close();
    process.exit(0);

  } catch (error) {
    logger.critical(`Main process error: ${error.message}`);
    rl.close();
    process.exit(1);
  }
}

// Ensure clean exit
process.on('SIGINT', () => {
  logger.bye('Process interrupted. Exiting...');
  rl.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.bye('Process terminated. Exiting...');
  rl.close();
  process.exit(0);
});

// Helper for delay, outside of run loop
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Jalankan main function
main();
