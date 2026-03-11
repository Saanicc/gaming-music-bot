import { JSX, Builder, loadImage } from "canvacord";

export class LevelCardBuilder extends Builder {
  constructor() {
    super(800, 300);
    this.bootstrap({
      displayName: "",
      username: "",
      avatar: "",
      rankBadge: "",
      rankTitle: "",
      level: 0,
      currentXp: 0,
      requiredXp: 0,
    });
  }

  setDisplayName(displayName: string) {
    this.options.set("displayName", displayName);
    return this;
  }

  setUsername(username: string) {
    this.options.set("username", username);
    return this;
  }

  setAvatar(value: string) {
    this.options.set("avatar", value);
    return this;
  }

  setLevel(level: number) {
    this.options.set("level", level);
    return this;
  }

  setCurrentXp(currentXp: number) {
    this.options.set("currentXp", currentXp);
    return this;
  }

  setRequiredXp(requiredXp: number) {
    this.options.set("requiredXp", requiredXp);
    return this;
  }

  setRankTitle(rankTitle: string) {
    this.options.set("rankTitle", rankTitle);
    return this;
  }

  setRankBadge(bagde: string) {
    this.options.set("rankBadge", bagde);
    return this;
  }

  async render() {
    const {
      displayName,
      username,
      avatar,
      level,
      currentXp,
      requiredXp,
      rankTitle,
      rankBadge,
    } = this.options.getOptions() as {
      displayName: string;
      username: string;
      avatar: string;
      level: number;
      currentXp: number;
      requiredXp: number;
      rankTitle: string;
      rankBadge: string;
    };
    const image = await loadImage(avatar);
    const badge = await loadImage(rankBadge);

    return JSX.createElement(
      "div",
      {
        style: {
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1c112b",
          padding: "24px",
          borderRadius: "12px",
        },
      },
      JSX.createElement(
        "div",
        {
          style: {
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            paddingLeft: "24px",
            paddingRight: "24px",
            gap: "32px",
            backgroundColor: "#ffffff08",
          },
        },

        //Avatar Element - left content
        JSX.createElement(
          "div",
          {
            style: {
              display: "flex",
              width: "auto",
              height: "100%",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "12px",
              gap: "12px",
            },
          },
          JSX.createElement("img", {
            src: image.toDataURL(),
            alt: "img",
            style: {
              height: "128px",
              width: "128px",
              borderRadius: "100px",
            },
          })
        ),

        // Right content
        JSX.createElement(
          "div",
          {
            style: {
              height: "100%",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "12px",
            },
          },
          // username row
          JSX.createElement(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "6px",
              },
            },
            JSX.createElement(
              "div",
              { style: { display: "flex", flexDirection: "column" } },

              JSX.createElement(
                "span",
                { style: { fontSize: "28px", color: "#fff" } },
                JSX.Fragment({ children: displayName })
              ),
              JSX.createElement(
                "span",
                { style: { fontSize: "20px", color: "#7b7b7b" } },
                JSX.Fragment({ children: username })
              )
            ),
            JSX.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyConent: "center",
                  gap: "12px",
                },
              },
              JSX.createElement("img", {
                src: badge.toDataURL(),
                alt: "img",
                style: {
                  height: "48px",
                  width: "48px",
                  borderRadius: "12px",
                },
              }),
              JSX.createElement(
                "span",
                { style: { fontSize: "22px", color: "#feffefff" } },
                JSX.Fragment({ children: rankTitle })
              )
            )
          ),
          // Progress bar
          JSX.createElement(
            "div",
            {
              style: {
                backgroundColor: "#ffffff2d",
                width: "100%",
                height: "24px",
                borderRadius: "25px",
                display: "flex",
                overflow: "hidden",
              },
            },
            JSX.createElement("div", {
              style: {
                display: "flex",
                backgroundColor: "#506eb9",
                width: `${(currentXp / requiredXp) * 100}%`,
                height: "100%",
                borderRadius: "25px",
              },
            })
          ),
          // XP/Level info
          JSX.createElement(
            "div",
            {
              style: {
                width: "100%",
                height: "auto",
                display: "flex",
                color: "#fff",
                gap: "13px",
              },
            },
            JSX.createElement(
              "span",
              {
                style: {
                  display: "flex",
                  flexDirection: "row",
                  fontSize: "16px",
                },
              },
              JSX.createElement(
                "span",
                { style: { color: "#7b7b7b" } },
                JSX.Fragment({ children: "LEVEL: " })
              ),
              JSX.createElement(
                "span",
                {},
                JSX.Fragment({ children: level.toString() })
              )
            ),
            JSX.createElement(
              "span",
              {
                style: {
                  display: "flex",
                  flexDirection: "row",
                  fontSize: "16px",
                },
              },
              JSX.createElement(
                "span",
                { style: { color: "#7b7b7b" } },
                JSX.createElement(
                  "span",
                  {},
                  JSX.Fragment({ children: "XP: " })
                )
              ),
              JSX.createElement(
                "span",
                {},
                JSX.createElement(
                  "span",
                  {},
                  JSX.Fragment({ children: `${currentXp}/${requiredXp}` })
                )
              )
            )
          )
        )
      )
    );
  }
}
