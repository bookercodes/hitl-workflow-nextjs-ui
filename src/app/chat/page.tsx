"use client";

import { mastraClient } from "@/lib/mastra-client";
import { useState, useRef } from "react";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputBody,
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
type WorkflowStep = "askEmail" | "askQuery" | "confirm" | "send";

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const runId = useRef("");
  const currentStep = useRef<WorkflowStep>(null);
  const workflow = mastraClient.getWorkflow("contactSalesWorkflow");

  const addMessage = (content: string, role: Role) => {
    const id = Math.random().toString();
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id,
        role,
        content,
      },
    ]);
    return id;
  };

  const updateMessage = (id: string, content: string) => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) => (msg.id === id ? { ...msg, content } : msg)),
    );
  };

  const handleInput = async (message: any) => {
    const input = message?.text;
    if (!input) return;
    addMessage(input, "user");

    // Add thinking message
    const thinkingId = addMessage("Thinking...", "assistant");
    setIsRunning(true);

    try {
      if (!currentStep.current) {
        const { runId: newRunId } = await workflow.createRunAsync();
        runId.current = newRunId;

        const response = await workflow.startAsync({
          runId: newRunId,
          inputData: {},
        });
        console.log("init.response", response);
        updateMessage(
          thinkingId,
          response.steps.askEmail.suspendPayload.message,
        );
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
          updateMessage(
            thinkingId,
            response.steps.askQuery.suspendPayload.message,
          );
          currentStep.current = "askQuery";
        } else {
          updateMessage(
            thinkingId,
            response.steps.askEmail.suspendPayload.message,
          );
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
        });
        console.log("askQuery.response", response);

        if (response.steps.askQuery.status === "success") {
          updateMessage(
            thinkingId,
            response.steps.confirm.suspendPayload.message,
          );
          currentStep.current = "confirm";
        } else {
          updateMessage(
            thinkingId,
            response.steps.askQuery.suspendPayload.message,
          );
        }
        return;
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleConfirm = async () => {
    const confirmed = window.confirm("Are you sure you want to send?");

    // Add thinking message
    const thinkingId = addMessage("Thinking...", "assistant");
    setIsRunning(true);

    try {
      const response = (await workflow.resumeAsync({
        runId: runId.current,
        step: "confirm",
        resumeData: {
          confirmed,
        },
      })) as any;
      console.log("confirm.response", response);
      updateMessage(thinkingId, response.result.message);
      currentStep.current = null;
    } finally {
      setIsRunning(false);
    }
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
            <PromptInputBody>
              <PromptInputTextarea placeholder="Enter text..." />
            </PromptInputBody>
            <PromptInputFooter className="flex justify-end">
              <PromptInputSubmit disabled={isRunning} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      )}
      {currentStep.current === "confirm" && (
        <div className="border-t p-4">
          <Button
            onClick={handleConfirm}
            className="w-full"
            disabled={isRunning}
          >
            Confirm
          </Button>
        </div>
      )}
    </div>
  );
}
