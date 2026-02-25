import { ChatInputCommandInteraction, ButtonInteraction } from "discord.js";
import { buildMessage } from "../bot-message/buildMessage";
import { ColorType } from "../constants/colors";
import { useTranslations } from "../hooks/useTranslations";

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
    title: "guards.noQueue.title",
    ephemeral: true,
    color: "info",
  },
  NO_TRACK_PLAYING: {
    title: "guards.noTrackPlaying.title",
    ephemeral: true,
    color: "info",
  },
  PLEASE_ADD_TRACKS: {
    title: "guards.pleaseAddTracks.title",
    ephemeral: true,
    color: "info",
  },

  // ── Guild / voice ────────────────────────────────────────────────────
  NO_GUILD: {
    title: "guards.noGuild.title",
    ephemeral: true,
  },
  NO_VOICE_CHANNEL: {
    title: "guards.noVoiceChannel.title",
    ephemeral: true,
  },
  NO_GUILD_MEMBERS: {
    title: "guards.noGuildMembers.title",
    ephemeral: true,
  },

  // ── Search results ───────────────────────────────────────────────────
  NO_RESULTS: {
    title: "guards.noResults.title",
  },
  NO_TRACK_FOUND: {
    title: "guards.noTrackFound.title",
    description: "guards.noTrackFound.description",
    color: "error",
    ephemeral: true,
  },

  // ── Track management ─────────────────────────────────────────────────
  NO_TRACK_URL: {
    title: "guards.noTrackUrl.title",
    ephemeral: true,
    color: "error",
  },
  TRACK_ALREADY_EXISTS: {
    title: "guards.trackAlreadyExists.title",
    ephemeral: true,
    color: "error",
  },
  INVALID_URL: {
    title: "guards.invalidUrl.title",
    description: "guards.invalidUrl.description",
    ephemeral: true,
    color: "error",
  },

  // ── Generic errors ───────────────────────────────────────────────────
  GENERIC_ERROR: {
    title: "guards.genericError.title",
    ephemeral: true,
    color: "error",
  },
  DB_SAVE_ERROR: {
    title: "guards.dbSaveError.title",
    ephemeral: true,
    color: "error",
  },
  PLAY_ERROR: {
    title: "guards.playError.title",
    description: "guards.playError.description",
    color: "error",
  },
  VOICE_CHANNEL_ERROR: {
    title: "guards.voiceChannelError.title",
    description: "Could not join voice channel.",
    color: "error",
  },

  // ── Music quiz ───────────────────────────────────────────────────────
  QUIZ_NO_VOICE_CHANNEL: {
    title: "guards.quizNoVoiceChannel.title",
    description: "guards.quizNoVoiceChannel.description",
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
  const t = useTranslations(interaction.guildId ?? "");

  const data = buildMessage({
    ...message,
    title: t(message.title),
    description: message.description ? t(message.description) : undefined,
  });
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
