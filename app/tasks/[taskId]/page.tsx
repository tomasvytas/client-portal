import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ChatInterface from '@/components/ChatInterface'

export default async function TaskPage({
  params,
}: {
  params: Promise<{ taskId: string }>
}) {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/api/auth/signin')
  }

  const { taskId } = await params
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      userId: session.user.id,
    },
  })

  if (!task) {
    redirect('/')
  }

  // Convert Prisma task to ChatInterface Task format
  const taskForInterface = {
    ...task,
    deadline: task.deadline ? task.deadline.toISOString() : null,
    estimatedPrice: task.estimatedPrice ? Number(task.estimatedPrice) : null,
  }

  return <ChatInterface taskId={taskId} initialTask={taskForInterface} />
}

