import express from "express";
import bodyParser from "body-parser";

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

import { http } from "viem";
import { createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { modeTestnet } from "viem/chains";

import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { MODE, USDC, erc20 } from "@goat-sdk/plugin-erc20";
import { kim } from "@goat-sdk/plugin-kim";
import { coingecko } from "@goat-sdk/plugin-coingecko";
import { sendETH } from "@goat-sdk/wallet-evm";
import { viem } from "@goat-sdk/wallet-viem";

require("dotenv").config();

const account = privateKeyToAccount("0x39989b7d4cd0544f12c520bf1e");

const walletClient = createWalletClient({
    account: account,
    transport: http(process.env.RPC_PROVIDER_URL),
    chain: modeTestnet,
});

(async () => {
    const tools = await getOnChainTools({
        wallet: viem(walletClient),
        plugins: [
            sendETH(),
            erc20({ tokens: [USDC, MODE] }),
            kim(),
            coingecko({ apiKey: "bCJJ"}),
        ],
    });

    const app = express();
    app.use(bodyParser.json());

    app.post("/api/prompt", async (req, res) => {
        const { prompt } = req.body;

        try {
            const result = await generateText({
                model: openai("gpt-4o-mini"),
                tools: tools,
                maxSteps: 10,
                prompt: prompt,
                onStepFinish: (event) => {
                    console.log(event.toolResults);
                },
            });
            res.json({ response: result.text });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Something went wrong" });
        }
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
})();
