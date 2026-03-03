import {
  PublicThreadChannel,
  VoiceBasedChannel,
  ChatInputCommandInteraction,
} from "discord.js";
import { Player, GuildQueue } from "discord-player";
import { useTranslations } from "@/utils/hooks/useTranslations";

export interface GameLoopOptions {
  thread: PublicThreadChannel;
  voiceChannel: VoiceBasedChannel;
  player: Player;
  interaction: ChatInputCommandInteraction;
  genre: string;
  rounds: number;
  t: ReturnType<typeof useTranslations>;
}

export interface QuizContext {
  thread: PublicThreadChannel;
  player: Player;
  queue: GuildQueue;
  scores: Map<string, number>;
  correctAnswers: Map<string, number>;
}

export interface QuestionOptions {
  property: "author" | "cleanTitle";
  questionText: string;
}
