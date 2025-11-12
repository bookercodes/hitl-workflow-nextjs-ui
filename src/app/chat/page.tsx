'use client'

import { mastraClient } from '@/lib/mastra-client'
import { useState, useRef, useMemo } from "react";
import { Conversation, ConversationContent } from '@/components/ai-elements/conversation'
import { Message, MessageContent } from '@/components/ai-elements/message'
import { PromptInput, PromptInputTextarea, PromptInputSubmit } from '@/components/ai-elements/prompt-input'
import { Button } from '@/components/ui/button'

type Role = 'user' | 'assistant'
type Message = {
  id: string
  role: Role
  content: string
}
type WorkflowStep = 'init' | 'askEmail' | 'askQuery' | 'confirm' | 'send'

export default function Chat() {
  const runId = useRef('')
  const [messages, setMessages] = useState<Message[]>([])
  const currentStep = useRef<WorkflowStep>('init')
  const workflow = useMemo(() => mastraClient.getWorkflow('contactSalesWorkflow'), [])

  const addMessage = (content: string, role: Role = 'assistant') => {
    setMessages((prevMessages) => [...prevMessages, {
      id: Math.random().toString(),
      role,
      content
    }])
  }

  const handleInput = async (message: any) => {
    const input = message?.text
    if (!input) return
    addMessage(input, 'user')

    if (currentStep.current === 'init') {
      const { runId: newRunId } = await workflow.createRunAsync()
      runId.current = newRunId

      const result = await workflow.startAsync({
        runId: newRunId,
        inputData: {}
      }) as any
      addMessage(result.steps.askEmail.suspendPayload.message, 'assistant')
      currentStep.current = 'askEmail'
      return
    }

    if (currentStep.current === 'askEmail') {
      const result = await workflow.resumeAsync({
        runId: runId.current,
        step: 'askEmail',
        resumeData: {
          email: input,
        },
      })

      if (result.steps.askEmail.status === 'success') {
        addMessage(result.steps.askQuery.suspendPayload.message, 'assistant')
        currentStep.current = 'askQuery'
      } else {
        addMessage(result.steps.askEmail.suspendPayload.message, 'assistant')
      }
      return
    }

    if (currentStep.current === 'askQuery') {
      const result = await workflow.resumeAsync({
        runId: runId.current,
        step: 'askQuery',
        resumeData: {
          query: input,
        },
      })

      if (result.steps.askQuery.status === 'success') {
        addMessage(result.steps.confirm.suspendPayload.message, 'assistant')
        currentStep.current = 'confirm'
      } else {
        addMessage(result.steps.askQuery.suspendPayload.message, 'assistant')
      }
      return
    }
  }

  const handleConfirm = async () => {
    const confirmed = window.confirm('Are you sure you want to send?')

    const result = await workflow.resumeAsync({
      runId: runId.current,
      step: 'confirm',
      resumeData: {
        confirmed
      },
    }) as any
    addMessage(result.result.message, 'assistant')
    currentStep.current = 'init'
  }


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
      {currentStep.current !== 'confirm' && (
        <div className="border-t p-4">
          <PromptInput onSubmit={handleInput}>
            <PromptInputTextarea placeholder="Enter text..." />
            <PromptInputSubmit />
          </PromptInput>
        </div>
      )}
      {currentStep.current === 'confirm' && (
        <div className="border-t p-4">
          <Button onClick={handleConfirm} className="w-full">Confirm</Button>
        </div>
      )}
    </div>
  )
}