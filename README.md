# Trulience + VAPI Integration

Next.js example integrating Trulience Avatars with the VAPI AI platform.

## Setup

1. Copy the example environment file:
```bash
cp .env.local.example .env.local
```

2. Configure your `.env.local` with the required values:

```env
# Vapi Configuration
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_public_key
NEXT_PUBLIC_VAPI_ASSISTANT_ID=your_vapi_assistant_id

# Trulience Configuration
NEXT_PUBLIC_TRULIENCE_SDK_URL=https://trulience.com/sdk/trulience.sdk.js
NEXT_PUBLIC_TRULIENCE_TOKEN=your_trulience_token
```

**Where to find these values:**
- **VAPI Public Key & Assistant ID**: Get from your [VAPI dashboard](https://vapi.ai/)
- **Trulience Token**: Available under *Account* at [trulience.com](https://www.trulience.com)

3. Install dependencies and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## What This Example Does

This integration connects a Trulience avatar with VAPI's AI assistant platform, enabling voice-powered interactions with a visual avatar interface.
