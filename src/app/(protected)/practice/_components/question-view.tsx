"use client";

import { Button } from "@/components/ui/button";
import { ParsedQuestion, QuestionChoice } from "@/types";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/contexts/session-provider";
import { answerQuestion } from "../actions";
import ChatBox from "./chat-box";

type QuestionViewProps = {
  question: ParsedQuestion;
};

export default function QuestionView({ question }: QuestionViewProps) {
  const { id } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [selection, setSelection] = useState<QuestionChoice | null>(null);
  const [isChecked, setIsChecked] = useState(false);

  async function handleSubmit() {
    if (!selection) return;
    setIsLoading(true);
    await answerQuestion(id, question.id, selection);
    setIsLoading(false);
    setIsChecked(true);
  }

  return (
    <div className="flex gap-8 p-8 h-full">
      <section className="flex flex-col flex-3 bg-background p-4 border-2 rounded-md overflow-y-auto">
        <p className="mb-2 font-semibold text-lg">Question</p>
        <p>{question.question}</p>
        <div className="flex flex-col flex-1 justify-end gap-4">
          <ul className="flex flex-col gap-2">
            {Object.entries(question.choices).map(([letter]) => (
              <QuestionChoiceView
                key={letter}
                choice={question.choices[letter as QuestionChoice]}
                explanation={question.explanations[letter as QuestionChoice]}
                letter={letter as QuestionChoice}
                isChecked={isChecked}
                isSelected={letter === selection}
                isCorrect={letter === question.answer}
                isLoading={isLoading}
                select={setSelection}
              />
            ))}
          </ul>
          {isChecked ? (
            <Button variant="accent" asChild>
              <Link href="/practice" className="flex items-center gap-2">
                <span>Next</span>
                <ArrowRight />
              </Link>
            </Button>
          ) : (
            <Button
              variant="accent"
              onClick={handleSubmit}
              disabled={isLoading || selection === null}
            >
              <span>Submit</span>
            </Button>
          )}
        </div>
      </section>
      {isChecked && <ChatBox question={question} answer={selection} />}
    </div>
  );
}

type QuestionChoiceViewProps = {
  choice: string;
  explanation: string;
  letter: QuestionChoice;
  isChecked: boolean;
  isSelected: boolean;
  isCorrect: boolean;
  isLoading: boolean;
  select: (letter: QuestionChoice) => void;
};

function QuestionChoiceView({
  choice,
  explanation,
  letter,
  isChecked,
  isSelected,
  isCorrect,
  isLoading,
  select,
}: QuestionChoiceViewProps) {
  function handleSelect() {
    if (!isChecked && !isLoading) select(letter);
  }

  return (
    <li
      onClick={handleSelect}
      className={cn(
        "flex items-center gap-2 bg-background p-2 border-2 rounded-md group",
        // not checked and not selected
        !isChecked &&
          !isLoading &&
          "cursor-pointer hover:border-custom-accent-light",
        // selected and not checked
        isSelected &&
          !isChecked &&
          "border-custom-accent hover:border-custom-accent",
        // checked and incorrect
        isSelected && isChecked && !isCorrect && "border-destructive",
        // checked and correct
        isChecked && isCorrect && "border-green-500"
      )}
    >
      <div
        className={cn(
          "font-bold text-lg border-2 rounded-full aspect-square px-2 mx-1 flex items-center justify-center",
          // not checked and not selected
          !isChecked && !isLoading && "group-hover:border-custom-accent-light",
          // selected and not checked
          isSelected &&
            !isChecked &&
            "border-custom-accent group-hover:border-custom-accent",
          // checked and incorrect
          isSelected && isChecked && !isCorrect && "border-destructive",
          // checked and correct
          isChecked && isCorrect && "border-green-500"
        )}
      >
        {letter.toUpperCase()}
      </div>
      <div>
        <p>{choice}</p>
        {isChecked && (
          <p className="text-muted-foreground text-sm">{explanation}</p>
        )}
      </div>
    </li>
  );
}
