const express = require("express");
const router = express.Router();

router.get("/symbols", (req, res) => {
    try {
        const symbols = [
            { "symbol": "EURUSD", "pip_precision": 0.0001 },
            { "symbol": "USDJPY", "pip_precision": 0.01 },
            { "symbol": "XAUUSD", "pip_precision": 0.1 },
            { "symbol": "BTCUSD", "pip_precision": 1.0 }
        ]
        res.status(200).json(symbols);
    } catch (error) {
        console.error("Error fetching symbols:", error);
        res.status(500).json({ error: "Internal server error" });
    }
   

});

module.exports = router;