import { JSX, Builder, loadImage } from "canvacord";

export type CommandData = {
  name: string;
  description: string;
};

export type HelpHeader = {
  title: string;
  avatar: string;
  subtitle: string;
};

export class HelpBuilder extends Builder {
  private header: HelpHeader | null = null;
  private footerText: string | null = null;
  private commands: CommandData[] = [];
  private backgroundColor: string = "#120a1f";
  private accentColor: string = "#d900ff";
  private secondaryColor: string = "#00d9ff";

  constructor() {
    super(900, 1200);
  }

  setHeader(header: HelpHeader) {
    this.header = header;
    return this;
  }

  setCommands(commands: CommandData[]) {
    this.commands = commands;
    return this;
  }

  setFooterText(text: string) {
    this.footerText = text;
    return this;
  }

  private async renderHeader() {
    if (!this.header) return null;
    const avatarImg = await loadImage(this.header.avatar);

    return JSX.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "24px",
          marginBottom: "32px",
          paddingBottom: "24px",
          borderBottom: `2px solid ${this.accentColor}`,
          width: "100%",
        },
      },
      JSX.createElement("img", {
        src: avatarImg.toDataURL(),
        style: {
          width: "150px",
          height: "150px",
          borderRadius: "50%",
          border: `2px solid rgba(255,255,255,0.1)`,
        },
      }),
      JSX.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
          },
        },
        JSX.createElement(
          "h1",
          {
            style: {
              fontSize: "48px",
              margin: 0,
              color: "#fff",
              fontFamily: "Inter, sans-serif",
            },
          },
          JSX.Fragment({ children: this.header.title })
        ),
        JSX.createElement(
          "span",
          {
            style: {
              fontSize: "24px",
              color: "#ccc",
              marginTop: "8px",
            },
          },
          JSX.Fragment({ children: this.header.subtitle })
        )
      )
    );
  }

  private renderCommandItem(cmd: CommandData, index: number) {
    const isEven = index % 2 === 0;
    return JSX.createElement(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "16px",
          borderLeft: `4px solid ${isEven ? this.accentColor : this.secondaryColor}`,
          boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          borderRight: "1px solid rgba(255,255,255,0.1)",
        },
      },
      JSX.createElement(
        "span",
        {
          style: {
            display: "flex",
            fontSize: "24px",
            fontWeight: "bold",
            color: "#fff",
          },
        },
        JSX.createElement(
          "span",
          {
            style: {
              color: isEven ? this.accentColor : this.secondaryColor,
              fontSize: "20px",
            },
          },
          JSX.Fragment({ children: ">" })
        ),
        JSX.Fragment({ children: `/${cmd.name}` })
      ),
      JSX.createElement(
        "span",
        {
          style: {
            fontSize: "16px",
            color: "#bbb",
            lineHeight: "1.4",
          },
        },
        JSX.Fragment({ children: cmd.description })
      )
    );
  }

  async render() {
    if (!this.header) throw new Error("Header is required!");
    if (!this.commands.length) throw new Error("Commands are required!");
    if (!this.footerText) throw new Error("Footer text is required!");

    const headerNode = await this.renderHeader();
    if (!headerNode) throw new Error("Failed to render header!");

    const commandNodes = this.commands.map((cmd, i) =>
      this.renderCommandItem(cmd, i)
    );

    const colWidth = Math.ceil(commandNodes.length / 2);
    const col1 = commandNodes.slice(0, colWidth);
    const col2 = commandNodes.slice(colWidth);

    return JSX.createElement(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "40px",
          backgroundColor: this.backgroundColor,
        },
      },
      headerNode,
      JSX.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "2%",
          },
        },
        JSX.createElement(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              flex: 1,
            },
          },
          ...col1
        ),
        JSX.createElement(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              flex: 1,
            },
          },
          ...col2
        )
      ),

      JSX.createElement(
        "div",
        {
          style: {
            marginTop: "auto",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "#666",
            fontSize: "14px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px",
            padding: "16px",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
          },
        },
        JSX.Fragment({
          children: this.footerText,
        })
      )
    );
  }
}
