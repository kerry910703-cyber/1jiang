const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// ===== 你的 Deeplol API =====
const API_URL =
  "https://b2c-api-cdn.deeplol.gg/ingame/ingame_info" +
  "?puu_id=hMA6bpw0bJdUiH9dDK87HZ0Fjr1IyUwNBLtmIqbVDK5bdIUMKfze6qP3TAZz8UNwKLBnund1W7_q_Q" +
  "&platform_id=KR" +
  "&season=27" +
  "&match_id=8240667986";

// ===== 排除自己 =====
const MY_PUUID =
  "hMA6bpw0bJdUiH9dDK87HZ0Fjr1IyUwNBLtmIqbVDK5bdIUMKfze6qP3TAZz8UNwKLBnund1W7_q_Q";

// ===== 英雄中文資料 =====
let championMap = {};

async function loadChampions() {
  try {
    const versionRes = await axios.get(
      "https://ddragon.leagueoflegends.com/api/versions.json"
    );

    const version = versionRes.data[0];

    const champRes = await axios.get(
      `https://ddragon.leagueoflegends.com/cdn/${version}/data/zh_TW/champion.json`
    );

    const champs = champRes.data.data;

    championMap = {};

    for (const champName in champs) {
      const champ = champs[champName];
      championMap[Number(champ.key)] =
        champ.name;
    }

    console.log("Champion data loaded");
  } catch (err) {
    console.error(
      "Champion load failed",
      err.message
    );
  }
}

app.get("/", (req, res) => {
  res.send("deeplol bot running");
});

app.get("/game", async (req, res) => {
  try {
    const response = await axios.get(API_URL, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0",
        "Accept":
          "application/json",
        "Referer":
          "https://www.deeplol.gg/"
      }
    });

    const data = response.data;

    // 沒在遊戲
    if (!data?.playing) {
      return res.send(
        "😴 目前不在遊戲中"
      );
    }

    const blueFound = [];
    const redFound = [];

    for (const p of data.participants_list || []) {

      // 排除自己
      if (p.puu_id === MY_PUUID) {
        continue;
      }

      const info =
        p?.summoner_data
          ?.summoner_basic_info_dict
          ?.pro_streamer_info_dict || {};

      const status =
        (info.status || "")
          .toLowerCase();

      // 只抓 PRO / STREAMER
      if (
        status !== "pro" &&
        status !== "streamer"
      ) {
        continue;
      }

      // 優先顯示職業名稱
      const displayName =
        info.championship_name &&
        info.championship_name !== "-"
          ? info.championship_name
          : info.name &&
            info.name !== "-"
          ? info.name
          : p.riot_id_name ||
            "未知玩家";

      // 英雄名稱
      const championName =
        championMap[p.champion_id] ||
        "未知英雄";

      const text =
        `${displayName}(${status.toUpperCase()})(${championName})`;

      // 藍紅方
      if (p.side === "BLUE") {
        blueFound.push(text);
      } else if (p.side === "RED") {
        redFound.push(text);
      }
    }

    const blue =
      [...new Set(blueFound)];

    const red =
      [...new Set(redFound)];

    // 沒撞車
    if (
      blue.length === 0 &&
      red.length === 0
    ) {
      return res.send(
        "😴 這把沒撞到 PRO / STR"
      );
    }

    return res.send(
      `🏆 Pros/Streamers | 🔵藍方：${blue.length ? blue.join("、") : "無"} | 🔴紅方：${red.length ? red.join("、") : "無"}`
    );

  } catch (err) {

    // Deeplol 沒在遊戲
    if (
      err.response &&
      err.response.status === 500
    ) {
      return res.send(
        "😴 目前不在遊戲中"
      );
    }

    console.error(err);

    return res.send(
      "❌ Deeplol API 暫時無法取得資料"
    );
  }
});

loadChampions();

app.listen(PORT, () => {
  console.log(`running ${PORT}`);
});
