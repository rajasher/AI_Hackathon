import { useState, useRef, useEffect } from "react";

// Speech Recognition type declarations
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User, CheckCircle, Clock, Circle, Trash2, Plus, Menu, X, ChevronDown, ChevronRight, Eye, FileText, Settings, Mic, MicOff, MessageSquare, ListTodo } from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface SubTask {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed';
  output?: string;
  description?: string;
  completedAt?: Date;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  subtasks: SubTask[];
}

interface SimpleTask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
}

export default function Index() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi, Good Morning! Ready to tackle today's security priorities?",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  
  const [tasks, setTasks] = useState<Task[]>([]);

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState<'updates' | 'tasks' | 'chat'>('chat');
  const [updatesFilter, setUpdatesFilter] = useState<'today' | 'yesterday' | 'week'>('today');
  const [simpleTasks, setSimpleTasks] = useState<SimpleTask[]>([
    { id: '1', title: 'Review daily security alerts', completed: false, createdAt: new Date() },
    { id: '2', title: 'Update firewall rules documentation', completed: true, createdAt: new Date() },
    { id: '3', title: 'Schedule vulnerability scan', completed: false, createdAt: new Date() }
  ]);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [wasVoiceInput, setWasVoiceInput] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Text-to-speech not supported in this browser');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Configure voice settings based on EZ configuration (could be enhanced with settings)
    utterance.rate = 1.2; // Slightly slower for clarity
    utterance.pitch = 1.0; // Normal pitch
    utterance.volume = 1; // Slightly quieter

    // Try to use a more natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice =>
      voice.name.includes('Google') ||
      voice.name.includes('Microsoft') ||
      voice.lang.startsWith('en')
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    // Track speaking status
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (activeTab === 'updates') {
      fetchUpdates();
    }
  }, [activeTab]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (fromVoice: boolean = false) => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageContent = inputMessage;
    setInputMessage('');
    setIsTyping(true);

    // Track if this was voice input for response
    const shouldSpeak = fromVoice || wasVoiceInput;
    setWasVoiceInput(false); // Reset after use

    const data = await generateAIResponse(messageContent);
    let responseContent = "I received a response, but I'm not sure how to display it.";

    if (data) {
        let parsedData = data;
        // Check if the main response is a stringified JSON and parse it.
        if (data.response && typeof data.response === 'string') {
            try {
                parsedData = JSON.parse(data.response);
            } catch (e) {
                console.error("Failed to parse response JSON string:", e);
                parsedData = null;
            }
        }

        // Assuming parsedData has a 'tool_results' property which is an array.
        if (parsedData && Array.isArray(parsedData.tool_results)) {
            const response_parts: string[] = [];
            response_parts.push("Based on your query, here's what I found: \n\n");

            for (const result of parsedData.tool_results) {
                if (result.tool === 'get_updates' && result.result) {
                    const toolData = result.result;
                    if (toolData.title) {
                        response_parts.push(`**${toolData.title}**\n`);
                        if(toolData.status) response_parts.push(`Status: ${toolData.status}\n`);
                        if(toolData.priority) response_parts.push(`Priority: ${toolData.priority}\n`);

                        if (Array.isArray(toolData.steps)) {
                            response_parts.push("\n**Steps:**\n");
                            for (const step of toolData.steps) {
                                if(step.step) response_parts.push(`- **${step.step}**`);
                                if(step.description) response_parts.push(`: ${step.description}\n`);
                                else response_parts.push(`\n`);

                                if(step.status) response_parts.push(`  Status: ${step.status}\n`);
                                if (step.output) {
                                    response_parts.push(`  Output: ${step.output}\n`);
                                }
                                response_parts.push("\n");
                            }
                        }
                    } else {
                        response_parts.push(`**Tool Result:**\n\`\`\`json\n${JSON.stringify(toolData, null, 2)}\n\`\`\`\n`);
                    }
                }
            }
            responseContent = response_parts.join('');
        } else if (typeof data === 'string') { // Handle string error responses
            responseContent = data;
        } else if (data.response && typeof data.response === 'string') {
            // Fallback to show the stringified JSON if parsing fails or it's not the expected structure
            responseContent = data.response;
        }
    }

    const aiResponse: Message = {
      id: (Date.now() + 1).toString(),
      content: responseContent,
      sender: 'ai',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, aiResponse]);
    setIsTyping(false);

    // Speak the response if it was voice input
    if (shouldSpeak) {
      setTimeout(() => speakText(responseContent), 500); // Small delay for better UX
    }
  };

  const fetchUpdates = async () => {
    console.log("1. [fetchUpdates] Starting...");
    const data = await fetchDailyUpdates();
    console.log("2. [fetchUpdates] Received data from API:", JSON.stringify(data, null, 2));

    if (data) {
      // The daily_updates endpoint returns a single update object or an array of them.
      const updates = Array.isArray(data) ? data : [data];

      if (updates.length > 0 && updates[0]) {
        console.log("4. [fetchUpdates] Found updates. Processing...", updates);
        const newTasks: Task[] = updates
          .map((toolData, index) => {
            if (!toolData || !toolData.title || !Array.isArray(toolData.steps)) {
              console.log(`Skipping invalid item at index ${index}`, toolData);
              return null;
            }
            console.log(`5. [fetchUpdates] Mapping result ${index}:`, toolData);
            const subtasks: SubTask[] = (toolData.steps || []).map((step, subIndex) => {
              const status = step.status ? step.status.toLowerCase() : 'pending';
              return {
                id: `${Date.now()}-${index}-${subIndex}`,
                title: step.step || `Step ${subIndex + 1}`,
                status: status === 'completed' ? 'completed' : status === 'in-progress' ? 'in-progress' : 'pending',
                output: step.output,
                description: step.description,
                completedAt: status === 'completed' ? new Date() : undefined,
              };
            });

            const priority = toolData.priority ? toolData.priority.toLowerCase() : 'medium';
            const status = toolData.status ? toolData.status.toLowerCase() : 'pending';

            return {
              id: `${Date.now()}-${index}`,
              title: toolData.title || 'Untitled Task',
              description: toolData.description || 'No description provided.',
              status: status === 'completed' ? 'completed' : status === 'in-progress' ? 'in-progress' : 'pending',
              priority: priority === 'high' ? 'high' : priority === 'low' ? 'low' : 'medium',
              createdAt: new Date(),
              subtasks: subtasks,
            };
          }).filter((task): task is Task => task !== null);
        console.log("6. [fetchUpdates] Mapped to newTasks array:", newTasks);
        setTasks(newTasks);
      } else {
        console.log("4a. [fetchUpdates] Data was empty or invalid.", { data });
        setTasks([]);
      }
    } else {
      console.log("2a. [fetchUpdates] Data from fetchDailyUpdates is falsy.");
    }
  };

  const fetchDailyUpdates = async (): Promise<any> => {
    try {
        const response = await fetch('http://localhost:8002/daily_updates');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();

    } catch (error) {
        console.error('Error fetching daily updates:', error);
        return { tool_results: [] };
    }
  };

  const generateAIResponse = async (userInput: string): Promise<any> => {
    const lowerInput = userInput.toLowerCase();

    try {
        const response = await fetch('http://localhost:8000/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 'query_input': lowerInput }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();

    } catch (error) {
        console.error('Error fetching AI response:', error);
        return "Sorry, I'm having trouble connecting to the server.";
    }
  };

  const extractTaskFromInput = (input: string): string | null => {
    // Simple task extraction patterns
    const patterns = [
      /create (?:a )?task (?:to |for )?(.+)/i,
      /add (?:a )?task (?:to |for )?(.+)/i,
      /(?:create|add) (.+)/i
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  };

  const createTaskFromChat = (title: string) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: title,
      description: 'Created from chat - click to add details',
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      subtasks: [
        {
          id: `${Date.now()}-1`,
          title: 'Step 1',
          status: 'pending'
        }
      ]
    };
    setTasks(prev => [...prev, newTask]);
  };

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const updateTaskStatus = (taskId: string, newStatus: Task['status']) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
  };

  const updateSubtaskStatus = (taskId: string, subtaskId: string, newStatus: SubTask['status']) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const updatedSubtasks = task.subtasks.map(subtask => 
          subtask.id === subtaskId 
            ? { ...subtask, status: newStatus, completedAt: newStatus === 'completed' ? new Date() : undefined }
            : subtask
        );
        // Update parent task status based on subtasks
        const completedSubtasks = updatedSubtasks.filter(st => st.status === 'completed').length;
        const inProgressSubtasks = updatedSubtasks.filter(st => st.status === 'in-progress').length;
        let parentStatus: Task['status'] = 'pending';
        
        if (completedSubtasks === updatedSubtasks.length) {
          parentStatus = 'completed';
        } else if (inProgressSubtasks > 0 || completedSubtasks > 0) {
          parentStatus = 'in-progress';
        }
        
        return { ...task, subtasks: updatedSubtasks, status: parentStatus };
      }
      return task;
    }));
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const addNewTask = () => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: 'New Task',
      description: 'Click to edit this task description',
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      subtasks: [
        {
          id: `${Date.now()}-1`,
          title: 'Step 1',
          status: 'pending'
        }
      ]
    };
    setTasks(prev => [...prev, newTask]);
  };

  const addSimpleTask = () => {
    if (!newTaskInput.trim()) return;

    const newTask: SimpleTask = {
      id: Date.now().toString(),
      title: newTaskInput.trim(),
      completed: false,
      createdAt: new Date()
    };
    setSimpleTasks(prev => [...prev, newTask]);
    setNewTaskInput('');
  };

  const toggleSimpleTask = (taskId: string) => {
    setSimpleTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteSimpleTask = (taskId: string) => {
    setSimpleTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const viewTaskDetails = (taskId: string) => {
    setViewingTaskId(taskId);
  };

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputMessage(transcript);
      setWasVoiceInput(true); // Mark as voice input
      setIsListening(false);

      // Auto-send the voice input after a brief delay
      setTimeout(() => {
        if (transcript.trim()) {
          handleSendMessage(true);
        }
      }, 100);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone permissions and try again.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const getStatusIcon = (status: Task['status'] | SubTask['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-task-completed" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-task-in-progress" />;
      default:
        return <Circle className="h-4 w-4 text-task-pending" />;
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    }
  };

  console.log("[Render] Component is rendering. Current tasks state:", tasks);
  const filteredTasks = (() => {
    if (activeTab === 'updates') {
      return tasks;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    return tasks.filter(task => {
      const hasRecentSubtaskActivity = task.subtasks.some(subtask => {
        if (!subtask.completedAt) return false;
        const completedDate = new Date(subtask.completedAt);
        switch (updatesFilter) {
          case 'today':
            return completedDate >= today;
          case 'yesterday':
            return completedDate >= yesterday && completedDate < today;
          case 'week':
            return completedDate >= weekStart;
          default:
            return true;
        }
      });

      const taskCreatedDate = new Date(task.createdAt);
      const isRecentTask = (() => {
        switch (updatesFilter) {
          case 'today':
            return taskCreatedDate >= today;
          case 'yesterday':
            return taskCreatedDate >= yesterday && taskCreatedDate < today;
          case 'week':
            return taskCreatedDate >= weekStart;
          default:
            return true;
        }
      })();

      return hasRecentSubtaskActivity || isRecentTask;
    });
  })();

  return (
    <div className="h-screen bg-background flex justify-center">
      {/* Unified Mobile App Layout */}
      <div className="w-full max-w-sm flex flex-col bg-background border-l border-r border-border dark">
        {/* App Header */}
        <div className="bg-card border-b border-border px-4 py-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <img 
                src="https://cdn.builder.io/api/v1/image/assets%2Fe5b95a00443849c9a85c01bf596294a5%2F4f46a67d02d9493eb078e60c0ed3f53e?format=webp&width=800"
                alt="EZ Security Robot"
                className="h-8 w-8 rounded-full object-cover"
              />
            </Avatar>
            <div className="flex-1">
              <h1 className="text-base font-semibold text-foreground">EZ</h1>
              <p className="text-xs text-muted-foreground">Autonomous Security Intelligence</p>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="h-7 w-7 p-0 bg-primary/10 hover:bg-primary/20 border border-primary/30 shadow-sm"
            >
              <Settings className="h-3 w-3 text-primary" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {/* Updates View */}
          {activeTab === 'updates' && (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-border">
                <div className="mb-3">
                  <h2 className="text-base font-semibold text-foreground">Updates</h2>
                </div>

                {/* Time Filter */}
                <div className="flex gap-2 mb-2">
                  <Button
                    variant={updatesFilter === 'today' ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => setUpdatesFilter('today')}
                    className={`h-6 text-xs px-2 ${
                      updatesFilter === 'today'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80'
                    }`}
                  >
                    Today
                  </Button>
                  <Button
                    variant={updatesFilter === 'yesterday' ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => setUpdatesFilter('yesterday')}
                    className={`h-6 text-xs px-2 ${
                      updatesFilter === 'yesterday'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80'
                    }`}
                  >
                    Yesterday
                  </Button>
                  <Button
                    variant={updatesFilter === 'week' ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => setUpdatesFilter('week')}
                    className={`h-6 text-xs px-2 ${
                      updatesFilter === 'week'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80'
                    }`}
                  >
                    This Week
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  {updatesFilter === 'today' && `${filteredTasks.filter(t => t.status === 'completed').length} of ${filteredTasks.length} updates today`}
                  {updatesFilter === 'yesterday' && `${filteredTasks.filter(t => t.status === 'completed').length} of ${filteredTasks.length} updates yesterday`}
                  {updatesFilter === 'week' && `${filteredTasks.filter(t => t.status === 'completed').length} of ${filteredTasks.length} updates this week`}
                </p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {filteredTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <ListTodo className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">No Updates</h3>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      {updatesFilter === 'today' && "No task updates today. Check back later or switch to a different time period."}
                      {updatesFilter === 'yesterday' && "No task updates yesterday. Try viewing today's updates or this week's summary."}
                      {updatesFilter === 'week' && "No task updates this week. All caught up!"}
                    </p>
                  </div>
                ) : (
                  filteredTasks.map((task) => (
                    <Card key={task.id} className="bg-card border-border hover:bg-accent/50 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <button
                            onClick={() => toggleTaskExpansion(task.id)}
                            className="text-foreground/60 hover:text-foreground shrink-0"
                          >
                            {expandedTasks.has(task.id) ? 
                              <ChevronDown className="h-3 w-3" /> : 
                              <ChevronRight className="h-3 w-3" />
                            }
                          </button>
                          <button
                            onClick={() => {
                              const nextStatus = task.status === 'pending' ? 'in-progress' : 
                                               task.status === 'in-progress' ? 'completed' : 'pending';
                              updateTaskStatus(task.id, nextStatus);
                            }}
                            className="shrink-0"
                          >
                            {getStatusIcon(task.status)}
                          </button>
                          <h3 className="font-medium text-foreground text-xs truncate">
                            {task.title}
                          </h3>
                        </div>
                        <div className="flex gap-1 shrink-0 items-center">
                          <Badge variant="secondary" className={`text-xs px-1.5 py-0.5 ${getPriorityColor(task.priority)}`}>
                            {task.priority[0].toUpperCase()}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => viewTaskDetails(task.id)}
                            className="h-5 w-5 p-0 text-muted-foreground hover:text-primary"
                            title="View Details"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                        {task.description}
                      </p>

                      {expandedTasks.has(task.id) && (
                        <div className="mt-2 space-y-1.5 border-t border-border pt-2">
                          {task.subtasks.map((subtask) => (
                            <div key={subtask.id} className="flex items-center gap-2 group">
                              <button
                                onClick={() => {
                                  const nextStatus = subtask.status === 'pending' ? 'in-progress' : 
                                                   subtask.status === 'in-progress' ? 'completed' : 'pending';
                                  updateSubtaskStatus(task.id, subtask.id, nextStatus);
                                }}
                                className="shrink-0"
                              >
                                {getStatusIcon(subtask.status)}
                              </button>
                              <span className={`text-xs flex-1 ${
                                subtask.status === 'completed' ? 'text-muted-foreground' : 'text-foreground'
                              }`}>
                                {subtask.title}{subtask.description ? `: ${subtask.description}` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tasks View */}
          {activeTab === 'tasks' && (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-border">
                <h2 className="text-base font-semibold text-foreground mb-3">Tasks</h2>

                {/* Add Task Input */}
                <div className="flex gap-2 mb-3">
                  <Input
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    placeholder="Add a new task..."
                    onKeyPress={(e) => e.key === 'Enter' && addSimpleTask()}
                    className="flex-1 text-xs h-8 text-foreground bg-background"
                  />
                  <Button
                    onClick={addSimpleTask}
                    size="sm"
                    className="px-3 h-8"
                    disabled={!newTaskInput.trim()}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  {simpleTasks.filter(t => t.completed).length} of {simpleTasks.length} completed
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {simpleTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <CheckCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">No Tasks</h3>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      Add your first task above to get started with your task management.
                    </p>
                  </div>
                ) : (
                  simpleTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:bg-accent/50 transition-colors">
                      <button
                        onClick={() => toggleSimpleTask(task.id)}
                        className="shrink-0"
                      >
                        {task.completed ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      <span className={`flex-1 text-sm ${
                        task.completed
                          ? 'text-muted-foreground line-through'
                          : 'text-foreground'
                      }`}>
                        {task.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {task.createdAt.toLocaleDateString()}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteSimpleTask(task.id)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Chat View */}
          {activeTab === 'chat' && (
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.sender === 'ai' && (
                      <Avatar className="h-6 w-6 shrink-0">
                        <img 
                          src="https://cdn.builder.io/api/v1/image/assets%2Fe5b95a00443849c9a85c01bf596294a5%2F4f46a67d02d9493eb078e60c0ed3f53e?format=webp&width=800"
                          alt="EZ Security Robot"
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[80%] p-2.5 rounded-lg ${
                        message.sender === 'user'
                          ? 'bg-chat-user text-chat-user-foreground'
                          : 'bg-chat-ai text-chat-ai-foreground'
                      }`}
                    >
                      <p className="text-xs leading-relaxed">{message.content}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {message.sender === 'user' && (
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          <User className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex gap-2 justify-start">
                    <Avatar className="h-6 w-6">
                      <img 
                        src="https://cdn.builder.io/api/v1/image/assets%2Fe5b95a00443849c9a85c01bf596294a5%2F4f46a67d02d9493eb078e60c0ed3f53e?format=webp&width=800"
                        alt="EZ Security Robot"
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    </Avatar>
                    <div className="bg-chat-ai text-chat-ai-foreground p-2.5 rounded-lg">
                      <div className="flex space-x-1">
                        <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse"></div>
                        <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Speaking Indicator */}
                {isSpeaking && (
                  <div className="flex gap-2 justify-start">
                    <Avatar className="h-6 w-6">
                      <img
                        src="https://cdn.builder.io/api/v1/image/assets%2Fe5b95a00443849c9a85c01bf596294a5%2F4f46a67d02d9493eb078e60c0ed3f53e?format=webp&width=800"
                        alt="EZ Security Robot"
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    </Avatar>
                    <div className="bg-chat-ai text-chat-ai-foreground p-2.5 rounded-lg flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-current rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-xs">Speaking...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="border-t border-border p-3">
                <div className="flex gap-2 mb-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type your message..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(false)}
                    className="flex-1 text-xs h-8 text-foreground bg-background"
                  />
                  <Button 
                    onClick={startVoiceInput} 
                    size="sm" 
                    variant={isListening ? "default" : "secondary"}
                    className={`px-2 h-8 ${isListening ? 'bg-red-500 hover:bg-red-600 text-white' : ''}`}
                    disabled={isListening}
                  >
                    {isListening ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                  </Button>
                  <Button onClick={() => handleSendMessage(false)} size="sm" className="px-2 h-8">
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
                
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setInputMessage("Show my progress");
                      setTimeout(() => handleSendMessage(false), 100);
                    }}
                    className="text-xs h-6 px-2 bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80"
                  >
                    📊 Progress
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setInputMessage("What should I work on next?");
                      setTimeout(() => handleSendMessage(false), 100);
                    }}
                    className="text-xs h-6 px-2 bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80"
                  >
                    🎯 Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="border-t border-border bg-card">
          <div className="flex">
            <button
              onClick={() => setActiveTab('updates')}
              className={`flex-1 flex flex-col items-center py-2 px-2 transition-colors ${
                activeTab === 'updates'
                  ? 'text-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ListTodo className="h-4 w-4 mb-1" />
              <span className="text-xs">Updates</span>
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex-1 flex flex-col items-center py-2 px-2 transition-colors ${
                activeTab === 'tasks'
                  ? 'text-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CheckCircle className="h-4 w-4 mb-1" />
              <span className="text-xs">Tasks</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 flex flex-col items-center py-2 px-2 transition-colors ${
                activeTab === 'chat'
                  ? 'text-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MessageSquare className="h-4 w-4 mb-1" />
              <span className="text-xs">Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Output Viewing Modal */}
      <Dialog open={!!viewingTaskId} onOpenChange={() => setViewingTaskId(null)}>
        <DialogContent className="w-[95vw] max-w-none sm:max-w-3xl h-[90vh] sm:max-h-[80vh] flex flex-col mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              Update Details
            </DialogTitle>
          </DialogHeader>
          {viewingTaskId && (() => {
            const task = tasks.find(t => t.id === viewingTaskId);
            if (!task) return null;

            return (
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {/* Main Task Details */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-foreground">{task.title}</h3>
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="flex items-center gap-1 font-medium">
                        {getStatusIcon(task.status)} {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Priority:</span>
                      <Badge variant="secondary" className={`text-xs ${getPriorityColor(task.priority)}`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Subtasks Table */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-base mb-2">Subtasks</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] bg-muted/50 text-xs font-medium text-muted-foreground min-w-[600px]">
                      <div className="p-2 border-b border-r">#</div>
                      <div className="p-2 border-b border-r">Description</div>
                      <div className="p-2 border-b border-r">Status</div>
                      <div className="p-2 border-b">Output</div>
                    </div>
                    <div className="min-w-[600px]">
                      {task.subtasks.map((subtask, index) => (
                        <div key={subtask.id} className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] text-xs items-start">
                          <div className="p-2 border-r">{subtask.title}</div>
                          <div className="p-2 border-r">{subtask.description || <span className="text-muted-foreground italic">N/A</span>}</div>
                          <div className="p-2 border-r flex items-center gap-1.5">
                            {getStatusIcon(subtask.status)}
                            <span>{subtask.status.charAt(0).toUpperCase() + subtask.status.slice(1)}</span>
                          </div>
                          <div className="p-2">
                            {subtask.output && (
                              <pre className="whitespace-pre-wrap font-sans text-xs">
                                {typeof subtask.output === 'object' ? JSON.stringify(subtask.output, null, 2) : subtask.output}
                              </pre>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="w-[95vw] max-w-none sm:max-w-4xl h-[95vh] sm:max-h-[90vh] overflow-y-auto mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="organization" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 gap-1 h-auto">
              <TabsTrigger value="organization" className="text-xs sm:text-sm px-2 py-2">Organization</TabsTrigger>
              <TabsTrigger value="user" className="text-xs sm:text-sm px-2 py-2">User</TabsTrigger>
              <TabsTrigger value="team" className="text-xs sm:text-sm px-2 py-2">Team</TabsTrigger>
              <TabsTrigger value="techstack" className="text-xs sm:text-sm px-2 py-2">Tech Stack</TabsTrigger>
              <TabsTrigger value="ez" className="text-xs sm:text-sm px-2 py-2 col-span-2 sm:col-span-1">EZ</TabsTrigger>
            </TabsList>
            
            <TabsContent value="organization" className="space-y-6 mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Organization Configuration</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input id="org-name" placeholder="Enter organization name" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="org-size">Organization Size</Label>
                    <Select>
                      <SelectTrigger id="org-size">
                        <SelectValue placeholder="Select organization size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small (1-50 employees)</SelectItem>
                        <SelectItem value="medium">Medium (51-500 employees)</SelectItem>
                        <SelectItem value="large">Large (501-5000 employees)</SelectItem>
                        <SelectItem value="enterprise">Enterprise (5000+ employees)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Select>
                      <SelectTrigger id="industry">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="finance">Financial Services</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="government">Government</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="environment">Environment</Label>
                    <Select>
                      <SelectTrigger id="environment">
                        <SelectValue placeholder="Select environment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cloud">Cloud-First</SelectItem>
                        <SelectItem value="hybrid">Hybrid Cloud</SelectItem>
                        <SelectItem value="on-premise">On-Premise</SelectItem>
                        <SelectItem value="multi-cloud">Multi-Cloud</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="priority-assets">Priority Asset Tags</Label>
                  <Textarea 
                    id="priority-assets" 
                    placeholder="List your most critical assets (e.g., Customer database, Financial systems, Intellectual property...)"
                    className="min-h-20"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="concern-areas">Concern Areas</Label>
                  <Textarea 
                    id="concern-areas" 
                    placeholder="Describe your main security concerns (e.g., Data breaches, Ransomware, Insider threats, Compliance...)"
                    className="min-h-20"
                  />
                </div>
                
                <Button className="w-full">Save Organization Settings</Button>
              </div>
            </TabsContent>
            
            <TabsContent value="user" className="space-y-6 mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Personal Configuration</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="user-name">Name</Label>
                    <Input id="user-name" placeholder="Enter your full name" defaultValue="Sam" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="user-role">Role</Label>
                    <Select>
                      <SelectTrigger id="user-role">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ciso">CISO</SelectItem>
                        <SelectItem value="security-analyst">Security Analyst</SelectItem>
                        <SelectItem value="security-engineer">Security Engineer</SelectItem>
                        <SelectItem value="incident-responder">Incident Responder</SelectItem>
                        <SelectItem value="compliance-officer">Compliance Officer</SelectItem>
                        <SelectItem value="security-manager">Security Manager</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="responsibilities">Responsibilities</Label>
                  <Textarea
                    id="responsibilities"
                    placeholder="Describe your key security responsibilities..."
                    className="min-h-20"
                  />
                </div>

                {/* Daily Focus and Workflow */}
                <div className="space-y-4">
                  <h4 className="font-medium text-base">Daily Focus & Workflow</h4>


                  <div className="space-y-2">
                    <Label htmlFor="daily-tasks">Typical Daily Tasks</Label>
                    <Textarea
                      id="daily-tasks"
                      placeholder="Describe your typical daily security tasks (e.g., monitoring alerts, reviewing logs, team meetings, incident investigations...)"
                      className="min-h-20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weekly-goals">Weekly Goals & Objectives</Label>
                    <Textarea
                      id="weekly-goals"
                      placeholder="What are your main goals and objectives for each week? (e.g., reduce false positives, complete compliance audits, implement new security controls...)"
                      className="min-h-20"
                    />
                  </div>
                </div>

                {/* Security Focus Areas */}
                <div className="space-y-4">
                  <h4 className="font-medium text-base">Security Focus Areas</h4>

                  <div className="space-y-3">
                    <Label>Primary Security Domains (Select all that apply)</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Network Security</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Endpoint Security</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Cloud Security</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Application Security</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Identity & Access Management</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Data Protection</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Vulnerability Management</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Threat Intelligence</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Incident Response</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Security Awareness</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Compliance & Audit</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Risk Management</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Current Priorities */}
                <div className="space-y-4">
                  <h4 className="font-medium text-base">Current Priorities & Metrics</h4>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="urgency-level">Current Workload Level</Label>
                      <Select>
                        <SelectTrigger id="urgency-level">
                          <SelectValue placeholder="How busy are you?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light (Manageable workload)</SelectItem>
                          <SelectItem value="moderate">Moderate (Steady pace)</SelectItem>
                          <SelectItem value="heavy">Heavy (High pressure)</SelectItem>
                          <SelectItem value="critical">Critical (Emergency mode)</SelectItem>
                          <SelectItem value="varies">Varies by day/week</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notification-urgency">Notification Priority Level</Label>
                      <Select>
                        <SelectTrigger id="notification-urgency">
                          <SelectValue placeholder="When should EZ alert you?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="critical">Critical incidents only</SelectItem>
                          <SelectItem value="high">High priority and above</SelectItem>
                          <SelectItem value="medium">Medium priority and above</SelectItem>
                          <SelectItem value="all">All security events</SelectItem>
                          <SelectItem value="custom">Custom threshold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="current-projects">Current Security Projects</Label>
                    <Textarea
                      id="current-projects"
                      placeholder="List your current security projects and initiatives (e.g., SIEM implementation, zero trust architecture, security training program...)"
                      className="min-h-20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="key-metrics">Key Metrics You Track</Label>
                    <Textarea
                      id="key-metrics"
                      placeholder="What security metrics do you monitor daily/weekly? (e.g., alert volume, MTTR, patch compliance, security score...)"
                      className="min-h-20"
                    />
                  </div>
                </div>


                <Button className="w-full">Save User Settings</Button>
              </div>
            </TabsContent>
            
            <TabsContent value="team" className="space-y-6 mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Team Management</h3>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Team
                  </Button>
                </div>
                
                <div className="space-y-6">
                  {/* Security Operations Team */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="font-medium text-base">Security Operations Team</h4>
                        <p className="text-sm text-muted-foreground">Incident Response, Security Monitoring, Threat Analysis</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Member
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="border rounded-md overflow-x-auto">
                      <div className="grid grid-cols-4 gap-4 p-3 bg-muted/50 border-b text-sm font-medium min-w-[600px]">
                        <div>Name</div>
                        <div>Email</div>
                        <div>Role</div>
                        <div>Actions</div>
                      </div>
                      <div className="divide-y">
                        <div className="grid grid-cols-4 gap-4 p-3 text-sm min-w-[600px]">
                          <div>John Smith</div>
                          <div className="truncate">john.smith@company.com</div>
                          <div>Senior Security Analyst</div>
                          <div>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4 p-3 text-sm min-w-[600px]">
                          <div>Sarah Johnson</div>
                          <div className="truncate">sarah.j@company.com</div>
                          <div>Incident Response Lead</div>
                          <div>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button className="w-full">Save Team Settings</Button>
              </div>
            </TabsContent>
            
            <TabsContent value="techstack" className="space-y-6 mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Technology Stack</h3>
                <p className="text-sm text-muted-foreground">Configure the tools and technologies your team uses daily.</p>
                
                <div className="space-y-4">
                  <h4 className="font-medium">Communication & Collaboration</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">O</div>
                        <span className="text-sm font-medium">Outlook</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="flex items-center p-3 border rounded-lg bg-purple-50 dark:bg-purple-950/20">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-white text-xs font-bold">T</div>
                        <span className="text-sm font-medium">Teams</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="flex items-center p-3 border rounded-lg bg-green-50 dark:bg-green-950/20">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center text-white text-xs font-bold">S</div>
                        <span className="text-sm font-medium">Slack</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Project Management</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center p-3 border rounded-lg bg-red-50 dark:bg-red-950/20">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white text-xs font-bold">SN</div>
                        <span className="text-sm font-medium">ServiceNow</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Social Media</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-8 h-8 bg-blue-700 rounded flex items-center justify-center text-white text-xs font-bold">in</div>
                        <span className="text-sm font-medium">LinkedIn</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Custom Integrations</h4>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Integration
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Input placeholder="Integration name" className="flex-1" />
                      <Input placeholder="API endpoint or URL" className="flex-1" />
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      💡 <strong>Tip:</strong> Add your security tools like SIEM platforms, vulnerability scanners, and monitoring solutions to help EZ better understand your environment.
                    </p>
                  </div>
                </div>

                <Button className="w-full">Save Tech Stack Settings</Button>
              </div>
            </TabsContent>
            
            <TabsContent value="ez" className="space-y-6 mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">EZ Configuration</h3>
                <p className="text-sm text-muted-foreground">Customize how EZ interacts with you and responds to your requests.</p>
                
                <div className="space-y-6">
                  {/* Avatar Selection */}
                  <div className="space-y-3">
                    <Label>Avatar Selection</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="flex flex-col items-center p-3 border rounded-lg cursor-pointer hover:bg-accent bg-primary/5 border-primary">
                        <img
                          src="https://cdn.builder.io/api/v1/image/assets%2Fe5b95a00443849c9a85c01bf596294a5%2F4f46a67d02d9493eb078e60c0ed3f53e?format=webp&width=800"
                          alt="EZ Default"
                          className="h-12 w-12 rounded-full object-cover mb-2"
                        />
                        <span className="text-xs font-medium">Default EZ</span>
                        <span className="text-xs text-primary">Selected</span>
                      </div>
                      <div className="flex flex-col items-center p-3 border rounded-lg cursor-pointer hover:bg-accent">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-2">
                          <Bot className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xs font-medium">Professional</span>
                        <span className="text-xs text-muted-foreground">Available</span>
                      </div>
                      <div className="flex flex-col items-center p-3 border rounded-lg cursor-pointer hover:bg-accent">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mb-2">
                          <Bot className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xs font-medium">Friendly</span>
                        <span className="text-xs text-muted-foreground">Available</span>
                      </div>
                      <div className="flex flex-col items-center p-3 border rounded-lg cursor-pointer hover:bg-accent">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-2">
                          <Bot className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xs font-medium">Casual</span>
                        <span className="text-xs text-muted-foreground">Available</span>
                      </div>
                    </div>
                  </div>

                  {/* Chat Behavior Settings */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Chat Behavior</h4>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="chat-assistance">Assistance Style</Label>
                        <Select>
                          <SelectTrigger id="chat-assistance">
                            <SelectValue placeholder="Select assistance style" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="proactive">Proactive (Suggests actions)</SelectItem>
                            <SelectItem value="responsive">Responsive (Answers questions)</SelectItem>
                            <SelectItem value="minimal">Minimal (Basic responses)</SelectItem>
                            <SelectItem value="detailed">Detailed (Comprehensive explanations)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="response-speed">Response Speed</Label>
                        <Select>
                          <SelectTrigger id="response-speed">
                            <SelectValue placeholder="Select response speed" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="instant">Instant</SelectItem>
                            <SelectItem value="fast">Fast (1-2 seconds)</SelectItem>
                            <SelectItem value="normal">Normal (2-3 seconds)</SelectItem>
                            <SelectItem value="thoughtful">Thoughtful (3-4 seconds)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="communication-tone">Communication Tone</Label>
                        <Select>
                          <SelectTrigger id="communication-tone">
                            <SelectValue placeholder="Select tone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="friendly">Friendly</SelectItem>
                            <SelectItem value="casual">Casual</SelectItem>
                            <SelectItem value="formal">Formal</SelectItem>
                            <SelectItem value="technical">Technical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="expertise-level">Explanation Level</Label>
                        <Select>
                          <SelectTrigger id="expertise-level">
                            <SelectValue placeholder="Select explanation level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner (Simple explanations)</SelectItem>
                            <SelectItem value="intermediate">Intermediate (Balanced)</SelectItem>
                            <SelectItem value="expert">Expert (Technical details)</SelectItem>
                            <SelectItem value="executive">Executive (High-level summaries)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Voice Settings */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Voice Settings</h4>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="voice-gender">Voice Gender</Label>
                        <Select>
                          <SelectTrigger id="voice-gender">
                            <SelectValue placeholder="Select voice gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="neutral">Neutral (Default)</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="male">Male</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="voice-accent">Voice Accent</Label>
                        <Select>
                          <SelectTrigger id="voice-accent">
                            <SelectValue placeholder="Select accent" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="us">US English</SelectItem>
                            <SelectItem value="uk">UK English</SelectItem>
                            <SelectItem value="au">Australian English</SelectItem>
                            <SelectItem value="ca">Canadian English</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="voice-speed">Voice Speed</Label>
                        <Select>
                          <SelectTrigger id="voice-speed">
                            <SelectValue placeholder="Select speech speed" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="slow">Slow</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="fast">Fast</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="voice-pitch">Voice Pitch</Label>
                        <Select>
                          <SelectTrigger id="voice-pitch">
                            <SelectValue placeholder="Select pitch" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Advanced Settings */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Advanced Settings</h4>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Auto-suggest tasks</Label>
                          <p className="text-xs text-muted-foreground">Let EZ suggest tasks based on your conversations</p>
                        </div>
                        <input type="checkbox" className="rounded" defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Proactive notifications</Label>
                          <p className="text-xs text-muted-foreground">Receive alerts for important security updates</p>
                        </div>
                        <input type="checkbox" className="rounded" defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Learning mode</Label>
                          <p className="text-xs text-muted-foreground">Allow EZ to learn from your preferences</p>
                        </div>
                        <input type="checkbox" className="rounded" defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Context awareness</Label>
                          <p className="text-xs text-muted-foreground">EZ remembers conversation context</p>
                        </div>
                        <input type="checkbox" className="rounded" defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Voice input auto-activation</Label>
                          <p className="text-xs text-muted-foreground">Start voice input with wake phrase</p>
                        </div>
                        <input type="checkbox" className="rounded" />
                      </div>
                    </div>
                  </div>

                  {/* Communication Preferences */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Communication Preferences</h4>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ez-communication-style">Preferred Communication Style</Label>
                        <Select>
                          <SelectTrigger id="ez-communication-style">
                            <SelectValue placeholder="How should EZ communicate?" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="direct">Direct & Concise</SelectItem>
                            <SelectItem value="detailed">Detailed & Thorough</SelectItem>
                            <SelectItem value="bullets">Bullet Points & Lists</SelectItem>
                            <SelectItem value="conversational">Conversational</SelectItem>
                            <SelectItem value="technical">Technical & Precise</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ez-update-frequency">Update Frequency</Label>
                        <Select>
                          <SelectTrigger id="ez-update-frequency">
                            <SelectValue placeholder="How often for updates?" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="realtime">Real-time</SelectItem>
                            <SelectItem value="hourly">Hourly summaries</SelectItem>
                            <SelectItem value="daily">Daily digest</SelectItem>
                            <SelectItem value="weekly">Weekly report</SelectItem>
                            <SelectItem value="ondemand">On-demand only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ez-escalation-preferences">Escalation Preferences</Label>
                      <Textarea
                        id="ez-escalation-preferences"
                        placeholder="When and how should EZ escalate issues? Who should be contacted for different types of incidents?"
                        className="min-h-20"
                      />
                    </div>
                  </div>

                  {/* Custom Instructions */}
                  <div className="space-y-2">
                    <Label htmlFor="custom-instructions">Custom Instructions</Label>
                    <Textarea
                      id="custom-instructions"
                      placeholder="Provide specific instructions on how you want EZ to interact with you (e.g., preferred terminology, specific workflow preferences...)"
                      className="min-h-24"
                    />
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      ����� <strong>Pro Tip:</strong> EZ learns from your preferences and adapts over time. The more specific your instructions, the better EZ can assist you with security operations.
                    </p>
                  </div>
                </div>
                
                <Button className="w-full">Save EZ Configuration</Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
