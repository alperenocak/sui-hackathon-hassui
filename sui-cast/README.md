# 🎓 Sui-Cast: Decentralized Student Document Library

Sui-Cast is a Web3 platform that allows students to share lecture notes, projects, and academic resources in a decentralized manner, vote on them, and earn NFT achievements in return for their contributions.

This project is powered by the high performance of **Sui Blockchain**, the decentralized storage solution of **Walrus**, and the user-friendly login experience of **zkLogin**.

---

## 🚀 Technologies and Integrations Used

Our project brings together the most up-to-date and powerful tools of the Sui ecosystem. Below are details and examples of how these technologies are used in our project.

| Technology / Tool | Purpose in Project | Related Files |
|-------------------|--------------------|---------------|
| **Sui Move** | Smart contract logic, `DocumentLibrary` and `StudentProfile` structures. | `move/sources/document_system.move` |
| **Sui dApp Kit** | Wallet connection and hooks in React interface. | `src/main.tsx`, `src/pages/LoginPage.tsx` |
| **Walrus** | Decentralized storage of large files (PDF, Images). | `src/pages/DocumentsPage.tsx` |
| **Sui TypeScript SDK** | Interaction with blockchain from frontend (PTB creation). | `src/lib/contracts.ts` |
| **Sui zkLogin** | Allowing Web2 users to log in without a wallet using Google. | `src/components/ZkLoginCard.tsx` |
| **Surflux** | Real-time notifications when a document is uploaded or voted on. | `src/lib/surflux.ts` |

---

## 💻 Usage with Code Examples

### 1. Sui Move & Object Model (Sui Official Docs & The Move Book)
We use Move language's `struct` and `object` capabilities for on-chain representation of documents and student profiles.

```move
// move/sources/document_system.move

public struct Document has key, store {
    id: UID,
    title: String,
    description: String,
    walrus_blob_id: String, // File reference on Walrus
    uploader: address,
    votes: u64,
    category: String,
}
```

### 2. Walrus Integration (Walrus Docs)
Users upload files directly to Walrus and save the returned `blobId` to the Sui blockchain. This keeps file content decentralized while ownership and metadata are kept on Sui.

```typescript
// src/pages/DocumentsPage.tsx (Example Flow)

// 1. Upload file to Walrus Publisher
const response = await fetch(`${WALRUS_PUBLISHER}/v1/store`, {
    method: "PUT",
    body: file
});
const data = await response.json();
const blobId = data.newlyCreated.blobObject.blobId;

// 2. Save Blob ID to Sui smart contract
uploadDocument(profileId, title, description, blobId, category);
```

### 3. Sui TypeScript SDK & PTB
We use the SDK's Programmable Transaction Block (PTB) structure to create and manage transactions.

```typescript
// src/lib/contracts.ts

export function uploadDocument(
  profileId: string,
  title: string,
  walrusBlobId: string,
  // ...
): Transaction {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::document_system::upload_document`,
    arguments: [
      tx.object(DOCUMENT_LIBRARY_ID),
      tx.object(profileId),
      tx.pure.string(title),
      tx.pure.string(walrusBlobId), // Walrus ID is linked here
      // ...
    ],
  });
  
  return tx;
}
```

### 4. Real-Time Updates (Surflux)
To enhance user experience, we listen to blockchain events with Surflux and show instant notifications.

```typescript
// src/lib/surflux.ts

export function useDocumentEventStream() {
  // Listen for 'DocumentUploaded' events via Surflux
  const query = `
    SELECT * FROM ${PACKAGE_ID}::document_system::DocumentUploaded
    ORDER BY timestamp DESC
  `;
  // ...
}
```

### 5. zkLogin (Sui zkLogin)
We enable students without crypto wallets to log in to the system using their Google accounts.

```typescript
// src/components/ZkLoginCard.tsx

// Generating salt and proof after Google OAuth flow
const zkLoginSignature = getZkLoginSignature({
    inputs: zkProof,
    maxEpoch,
    userSignature,
});
```

---

## 🛠️ Installation and Running

To run the project in your local environment:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/username/sui-cast.git
   cd sui-cast
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   
   Create a `.env` file in the root directory by copying the example:
   ```bash
   cp env.exemple .env
   ```
   
   Then fill in the required values:
   ```env
   # Sui Network Configuration
   VITE_SUI_RPC_URL="https://fullnode.testnet.sui.io:443"
   
   # Google OAuth for zkLogin
   VITE_GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
   VITE_ZKLOGIN_REDIRECT_URL="http://localhost:5173"
   VITE_ZK_PROVER_URL="https://prover-dev.mystenlabs.com/v1"
   
   # Deployed Smart Contract IDs (Testnet)
   VITE_PACKAGE_ID="0xbfaff760182ed4b267cbf6db6ceaa28012b2adb48a2e2db0c51023efa2f1fda7"
   VITE_DOCUMENT_LIBRARY_ID="0xd4a75ba83ee878c99fcdbf493e4211316dc6d62492dd23ee7416135fabb1e793"
   VITE_ACHIEVEMENT_MINTER_ID="0xf9799f420495793f17e33e3efefef4bae0d511f482e5b5eec8795322048f9496"
   
   # Surflux Real-time Streams (Optional - for real-time notifications)
   VITE_SURFLUX_API_KEY="your-surflux-api-key"
   ```

   > **Note:** To get a Google Client ID, create a project in [Google Cloud Console](https://console.cloud.google.com/), enable OAuth 2.0, and add your redirect URI to the authorized redirect URIs.

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Compile Move Contracts (Optional):**
   ```bash
   cd move
   sui move build
   ```

---

## 🎯 Our Goal

Sui-Cast aims to ensure the free circulation of academic knowledge while transparently rewarding contributing students. It offers an end-user familiar and fast Web2 experience by keeping the complexity of Web3 technologies (Sui, Walrus, zkLogin) in the background.
