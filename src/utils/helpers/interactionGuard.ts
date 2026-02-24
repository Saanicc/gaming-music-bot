import { ChatInputCommandInteraction, ButtonInteraction } from "discord.js";
import { buildMessage } from "../bot-message/buildMessage";
import { ColorType } from "../constants/colors";

// ---------------------------------------------------------------------------
// Centralized guard‑error message definitions
// ---------------------------------------------------------------------------

interface BuildMessagePayload {
  title: string;
  description?: string;
  ephemeral?: boolean;
  color?: ColorType;
}

/**
 * Every static guard‑error message lives here.
 * To change copy, edit a single entry — every call‑site picks it up automatically.
 */
export const GUARD_MESSAGES = {
  // ── Queue / player state ──────────────────────────────────────────────
  NO_QUEUE: {
    title: "This server does not have an active player session.",
    ephemeral: true,
    color: "info",
  },
  NO_TRACK_PLAYING: {
    title: "There is no track playing.",
    ephemeral: true,
    color: "info",
  },
  PLEASE_ADD_TRACKS: {
    title: "Please add some tracks first",
    ephemeral: true,
    color: "info",
  },

  // ── Guild / voice ────────────────────────────────────────────────────
  NO_GUILD: {
    title: "No guild was found.",
    ephemeral: true,
  },
  NO_VOICE_CHANNEL: {
    title: "You must be in a voice channel to play music.",
    ephemeral: true,
  },
  NO_GUILD_MEMBERS: {
    title: "No guild members found.",
    ephemeral: true,
  },

  // ── Search results ───────────────────────────────────────────────────
  NO_RESULTS: {
    title: "No results found.",
  },
  NO_TRACK_FOUND: {
    title: "No track found",
    description:
      "No track with that URL was found, please make sure the URL is valid.",
    color: "error",
    ephemeral: true,
  },

  // ── Track management ─────────────────────────────────────────────────
  NO_TRACK_URL: {
    title: "No url found for the current track",
    ephemeral: true,
    color: "error",
  },
  TRACK_ALREADY_EXISTS: {
    title: "The track already exist!",
    ephemeral: true,
    color: "error",
  },
  INVALID_URL: {
    title: "Not a valid url",
    description: "Please enter a valid url",
    ephemeral: true,
    color: "error",
  },

  // ── Generic errors ───────────────────────────────────────────────────
  GENERIC_ERROR: {
    title: "An error occured. Please try again.",
    ephemeral: true,
    color: "error",
  },
  DB_SAVE_ERROR: {
    title: "An error occured when saving track to database. Please try again.",
    ephemeral: true,
    color: "error",
  },
  PLAY_ERROR: {
    title: "Error",
    description: "Something went wrong while trying to play.",
    color: "error",
  },
  VOICE_CHANNEL_ERROR: {
    title: "Error",
    description: "Could not join voice channel.",
    color: "error",
  },

  // ── Music quiz ───────────────────────────────────────────────────────
  QUIZ_NO_VOICE_CHANNEL: {
    title: "Error",
    description: "You must be in a voice channel to start the quiz.",
    color: "error",
    ephemeral: true,
  },
} as const satisfies Record<string, BuildMessagePayload>;

// ---------------------------------------------------------------------------
// Guard reply helper
// ---------------------------------------------------------------------------

type GuardMessageKey = keyof typeof GUARD_MESSAGES;
type ReplyMethod = "reply" | "editReply" | "followUp";
type Repliable = ChatInputCommandInteraction | ButtonInteraction;

/**
 * Build the error message for a guard key and send it via the specified
 * interaction reply method.
 *
 * When the method is `editReply` and the message is ephemeral, Discord won't
 * respect the ephemeral flag because it must be set on the initial `deferReply`.
 * In that case we delete the deferred reply and fall back to `followUp`, which
 * can independently be ephemeral.
 *
 * @returns The interaction response promise — callers should `return guardReply(…)`.
 */
export const guardReply = async (
  interaction: Repliable,
  messageKey: GuardMessageKey,
  method: ReplyMethod = "reply"
): Promise<unknown> => {
  const message = GUARD_MESSAGES[messageKey] as BuildMessagePayload;
  const data = buildMessage(message);
  const isEphemeral = message.ephemeral === true;

  if (method === "editReply" && isEphemeral) {
    await interaction.deleteReply().catch(() => {});
    return interaction.followUp(data);
  }

  switch (method) {
    case "reply":
      return interaction.reply(data);
    case "editReply":
      return interaction.editReply(data);
    case "followUp":
      return interaction.followUp(data);
  }
};
