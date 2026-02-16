import { JSX, Builder, loadImage } from "canvacord";
import { getRankImage } from "@/modules/rankSystem";

export type PlayerData = {
  avatar: string;
  username: string;
  displayName: string;
  level: number;
  xp: number;
  rank: number;
  rankTitle: string;
};

export type LeaderboardHeader = {
  leaderBoardType: "xp" | "music_quiz";
  leaderBoardTitle: string;
  title: string;
  image: string;
  subtitle: string;
};

export class LeaderboardBuilder extends Builder {
  private header: LeaderboardHeader | null = null;
  private players: PlayerData[] = [];
  private backgroundColor: string = "#120a1f";
  private cardBackgroundColor: string = "rgba(255, 255, 255, 0.05)";
  private border: string = "1px solid rgba(255,255,255,0.1)";
  private boxShadow: string = "0 4px 6px rgba(0,0,0,0.3)";

  constructor() {
    super(600, 960);
  }

  setHeader(header: LeaderboardHeader) {
    this.header = header;
    return this;
  }

  setPlayers(players: PlayerData[]) {
    this.players = players.slice(0, 8);
    return this;
  }

  setBackgroundColor(backgroundColor: string) {
    this.backgroundColor = backgroundColor;
    return this;
  }

  private async renderPlayer(player: PlayerData) {
    const avatarImg = await loadImage(player.avatar);

    return JSX.createElement(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginTop: "12px",
          padding: "8px 16px",
          backgroundColor: this.cardBackgroundColor,
          borderRadius: "12px",
          border: this.border,
          boxShadow: this.boxShadow,
        },
      },
      JSX.createElement(
        "span",
        { style: { fontSize: "20px", padding: "6px", color: "#FFF" } },
        JSX.Fragment({ children: `${player.rank}` })
      ),
      // Avatar
      JSX.createElement("img", {
        src: avatarImg.toDataURL(),
        alt: player.username,
        style: { width: "64px", height: "64px", borderRadius: "50%" },
      }),
      // Name & Username
      JSX.createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", flex: 1 } },
        JSX.createElement(
          "span",
          { style: { fontSize: "20px", color: "#fff" } },
          JSX.Fragment({ children: player.displayName })
        ),
        JSX.createElement(
          "span",
          { style: { fontSize: "16px", color: "#7b7b7b" } },
          JSX.Fragment({ children: player.username })
        )
      ),
      // Rank title & Level/XP
      JSX.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "4px",
          },
        },
        JSX.createElement(
          "span",
          {
            style: {
              fontSize: "16px",
              color: "#feffefff",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            },
          },
          JSX.createElement("img", {
            src: getRankImage(player.level),
            style: {
              width: "24px",
              height: "24px",
            },
          }),
          JSX.Fragment({ children: player.rankTitle })
        ),
        JSX.createElement(
          "span",
          { style: { fontSize: "14px", color: "#7b7b7b" } },
          JSX.Fragment({ children: `Level ${player.level} - ${player.xp} XP` })
        )
      )
    );
  }

  private async renderTopThree() {
    const top3 = this.players.slice(0, 3);
    [top3[0], top3[1]] = [top3[1], top3[0]];

    const imgs = await Promise.all(top3.map((p) => loadImage(p.avatar)));

    const getTop3PlayerColor = (index: number) =>
      index === 0 ? "#00c3ffff" : index === 1 ? "#ffca1cff" : "#00ff00ff";

    return JSX.createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
          marginBottom: "24px",
          marginTop: "24px",
          boxShadow: this.boxShadow,
        },
      },
      ...top3.map((player, index) =>
        JSX.createElement(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flex: 1,
              backgroundColor:
                index === 1 ? "#FFFFFF18" : this.cardBackgroundColor,
              padding: "12px",
              borderRadius: "12px",
              borderBottomRightRadius: index !== 2 ? "0px" : "12px",
              borderBottomLeftRadius: index !== 0 ? "0px" : "12px",
              borderTop: this.border,
              borderBottom: this.border,
              borderLeft: index === 0 ? this.border : "none",
              borderRight: index === 2 ? this.border : "none",
              borderTopLeftRadius: index === 2 ? "0px" : "12px",
              borderTopRightRadius: index === 0 ? "0px" : "12px",
            },
            key: player.username,
          },
          JSX.createElement(
            "span",
            { style: { fontSize: "20px", padding: "6px", color: "#FFF" } },
            JSX.Fragment({ children: `${player.rank}` })
          ),
          JSX.createElement("img", {
            src: imgs[index].toDataURL(),
            style: {
              width: index === 1 ? "96px" : "72px",
              height: index === 1 ? "96px" : "72px",
              borderRadius: "50%",
              border: `3px solid ${getTop3PlayerColor(index)}`,
            },
          }),
          JSX.createElement(
            "span",
            {
              style: {
                color: "#fff",
                marginTop: "8px",
                fontSize: "16px",
                marginBottom: "6px",
              },
            },
            JSX.Fragment({ children: player.displayName })
          ),
          JSX.createElement(
            "span",
            {
              style: {
                color: "#7b7b7b",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              },
            },
            JSX.createElement("img", {
              src: getRankImage(player.level),
              style: {
                width: "24px",
                height: "24px",
              },
            }),
            JSX.Fragment({ children: player.rankTitle })
          ),
          JSX.createElement(
            "span",
            {
              style: {
                color: getTop3PlayerColor(index),
                fontSize: "14px",
                marginTop: "8px",
              },
            },
            JSX.Fragment({ children: `Level ${player.level}` })
          ),
          JSX.createElement(
            "span",
            { style: { color: getTop3PlayerColor(index), fontSize: "14px" } },
            JSX.Fragment({ children: `${player.xp} XP` })
          )
        )
      )
    );
  }

  async render() {
    if (!this.header) throw new Error("Header is required!");
    const bgImage = await loadImage(this.header.image);
    const topThree = await this.renderTopThree();
    const otherPlayers = await Promise.all(
      this.players.slice(3).map((p) => this.renderPlayer(p))
    );

    return JSX.createElement(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "24px",
          backgroundColor: this.backgroundColor,
          borderRadius: "16px",
        },
      },
      // Header
      JSX.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          },
        },
        JSX.createElement(
          "span",
          {
            style: {
              fontSize: "26px",
              color: "#fff",
              backgroundColor: this.cardBackgroundColor,
              padding: "12px",
              borderRadius: "12px",
              border: this.border,
              boxShadow: this.boxShadow,
            },
          },
          JSX.Fragment({ children: this.header.leaderBoardTitle })
        ),
        JSX.createElement("img", {
          src: bgImage.toDataURL(),
          style: { width: "64px", height: "64px", borderRadius: "12px" },
        }),
        JSX.createElement(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            },
          },
          JSX.createElement(
            "span",
            { style: { fontSize: "26px", color: "#fff" } },
            JSX.Fragment({ children: this.header.title })
          ),
          JSX.createElement(
            "span",
            { style: { fontSize: "16px", color: "#7b7b7b" } },
            JSX.Fragment({ children: this.header.subtitle })
          )
        )
      ),
      topThree,
      ...otherPlayers
    );
  }
}
