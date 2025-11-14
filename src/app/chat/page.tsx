"use client";

import { mastraClient } from "@/lib/mastra-client";
import { useState, useRef, useMemo } from "react";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";

type Role = "user" | "assistant";
type Message = {
  id: string;
  role: Role;
  content: string;
};
type WorkflowStep =  "askEmail" | "askQuery" | "confirm" | "send";

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const runId = useRef("");
  const currentStep = useRef<WorkflowStep>(null);
  const workflow = useMemo(
    () => mastraClient.getWorkflow("contactSalesWorkflow"),
    [],
  );

  const addMessage = (content: string, role: Role) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: Math.random().toString(),
        role,
        content,
      },
    ]);
  };

  const handleInput = async (message: any) => {
    const input = message?.text;
    if (!input) return;
    addMessage(input, "user");

    if (!currentStep.current) {
      const { runId: newRunId } = await workflow.createRunAsync();
      runId.current = newRunId;

      const response = await workflow.startAsync({
        runId: newRunId,
        inputData: {},
      })
      console.log("init.response", response);
      addMessage(response.steps.askEmail.suspendPayload.message, "assistant");
      currentStep.current = "askEmail";
      return;
    }

    if (currentStep.current === "askEmail") {
      const response = await workflow.resumeAsync({
        runId: runId.current,
        step: "askEmail",
        resumeData: {
          email: input,
        },
      });

      console.log("askEmail.response", response);
      if (response.steps.askEmail.status === "success") {
        addMessage(response.steps.askQuery.suspendPayload.message, "assistant");
        currentStep.current = "askQuery";
      } else {
        addMessage(response.steps.askEmail.suspendPayload.message, "assistant");
      }
      return;
    }

    if (currentStep.current === "askQuery") {
      const response = await workflow.resumeAsync({
        runId: runId.current,
        step: "askQuery",
        resumeData: {
          query: input,
        },
      })
      console.log("askQuery.response", response);

      if (response.steps.askQuery.status === "success") {
        addMessage(response.steps.confirm.suspendPayload.message, "assistant");
        currentStep.current = "confirm";
      } else {
        addMessage(response.steps.askQuery.suspendPayload.message, "assistant");
      }
      return;
    }
  };

  const handleConfirm = async () => {
    const confirmed = window.confirm("Are you sure you want to send?");

    const response = await workflow.resumeAsync({
      runId: runId.current,
      step: "confirm",
      resumeData: {
        confirmed,
      },
    }) as any
    console.log("confirm.response",response)
    addMessage(response.result.message, "assistant");
    currentStep.current = null
  };

  return (
    <div className="flex h-screen flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>{message.content}</MessageContent>
            </Message>
          ))}
        </ConversationContent>
      </Conversation>
      {currentStep.current !== "confirm" && (
        <div className="border-t p-4">
          <PromptInput onSubmit={handleInput}>
            <PromptInputTextarea placeholder="Enter text..." />
            <PromptInputSubmit />
          </PromptInput>
        </div>
      )}
      {currentStep.current === "confirm" && (
        <div className="border-t p-4">
          <Button onClick={handleConfirm} className="w-full">
            Confirm
          </Button>
        </div>
      )}
    </div>
  );
}
