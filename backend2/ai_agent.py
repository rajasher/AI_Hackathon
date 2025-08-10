import asyncio
import logging
from typing import Optional, Dict, Any
import json
import os
from datetime import datetime
from dotenv import load_dotenv
from tools import execute_tool

# You can use different AI providers - uncomment the one you want to use:

# Option 1: OpenAI
import openai

# Option 2: Anthropic Claude
# import anthropic

# Option 3: Google Gemini
# import google.generativeai as genai

# Option 4: Local LLM via Ollama
# import requests
load_dotenv()
logger = logging.getLogger(__name__)

class AIAgent:
    """
    AI Agent service that processes user queries through various AI providers
    """
    
    def __init__(self):
        self.provider = os.getenv("AI_PROVIDER", "mock")  # mock, openai, anthropic, gemini, ollama
        self.model = os.getenv("AI_MODEL", "gpt-3.5-turbo")
        self.api_key = os.getenv("AI_API_KEY")
        self.session_history: Dict[str, list] = {}
        self.client = None
        self.agent_config = self._load_agent_config()
        
        # Initialize the selected AI provider
        self._initialize_provider()
    
    def _load_agent_config(self) -> Dict[str, Any]:
        """Load agent configuration from JSON file"""
        try:
            config_path = os.path.join(os.path.dirname(__file__), "mainagent_config.json")
            with open(config_path, 'r') as f:
                config = json.load(f)
            logger.info("Agent configuration loaded successfully")
            return config
        except Exception as e:
            logger.warning(f"Failed to load agent config: {e}")
            # Fallback configuration
            return {
                "system_role": "You are a helpful AI assistant.",
                "context": "Assist users with their queries.",
                "instructions": ["Be helpful and informative"],
                "tools": []
            }
    
    def _initialize_provider(self):
        """Initialize the selected AI provider"""
        try:
            if self.provider == "openai":
                if not self.api_key:
                    raise ValueError("OpenAI API key not found. Set AI_API_KEY environment variable.")
                
                # Initialize client with tools if available
                tools = self.agent_config.get("tools", [])
                self.client = openai.OpenAI(
                    base_url="https://api.rdsec.trendmicro.com/prod/aiendpoint/v1/", 
                    api_key=self.api_key
                )
                self.tools = tools
                logger.info(f"OpenAI provider initialized with {len(tools)} tools")
                
            elif self.provider == "anthropic":
                if not self.api_key:
                    raise ValueError("Anthropic API key not found. Set AI_API_KEY environment variable.")
                # self.client = anthropic.Anthropic(api_key=self.api_key)
                logger.info("Anthropic provider initialized")
                
            elif self.provider == "gemini":
                if not self.api_key:
                    raise ValueError("Google API key not found. Set AI_API_KEY environment variable.")
                # genai.configure(api_key=self.api_key)
                logger.info("Gemini provider initialized")
                
            elif self.provider == "ollama":
                self.ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
                logger.info(f"Ollama provider initialized at {self.ollama_url}")
                
            else:
                logger.info("Using mock AI provider for testing")
                
        except Exception as e:
            logger.warning(f"Failed to initialize {self.provider} provider: {e}")
            logger.info("Falling back to mock provider")
            self.provider = "mock"
    
    async def process_query(self, query: str, user_id: Optional[str] = None, session_id: Optional[str] = None) -> str:
        """
        Process a user query through the AI agent
        
        Args:
            query: The user's input query
            user_id: Optional user identifier
            session_id: Optional session identifier for conversation continuity
            
        Returns:
            AI agent's response as a string
        """
        try:
            # Log the query
            logger.info(f"Processing query for user {user_id}, session {session_id}")
            
            # Get conversation history if session_id is provided
            conversation_context = self._get_conversation_context(session_id)
            
            # Process query based on provider
            if self.provider == "openai":
                response = await self._process_openai(query, conversation_context)
            elif self.provider == "anthropic":
                response = await self._process_anthropic(query, conversation_context)
            elif self.provider == "gemini":
                response = await self._process_gemini(query, conversation_context)
            elif self.provider == "ollama":
                response = await self._process_ollama(query, conversation_context)
            else:
                response = await self._process_mock(query, conversation_context)
            
            # Update conversation history
            self._update_conversation_history(session_id, query, response)
            
            return response
            
        except Exception as e:
            logger.error(f"Error processing query: {str(e)}")
            return f"I apologize, but I encountered an error while processing your request: {str(e)}"
    
    def _get_conversation_context(self, session_id: Optional[str]) -> list:
        """Get conversation history for the session"""
        if not session_id:
            return []
        return self.session_history.get(session_id, [])
    
    def _update_conversation_history(self, session_id: Optional[str], query: str, response: str):
        """Update conversation history"""
        if not session_id:
            return
        
        if session_id not in self.session_history:
            self.session_history[session_id] = []
        
        self.session_history[session_id].append({
            "timestamp": datetime.now().isoformat(),
            "query": query,
            "response": response
        })
        
        # Keep only last 10 exchanges to manage memory
        if len(self.session_history[session_id]) > 10:
            self.session_history[session_id] = self.session_history[session_id][-10:]
    
    async def _process_openai(self, query: str, context: list) -> str:
        """Process query using OpenAI API with tools - optimized single call approach"""
        try:
            # Build system message from configuration
            system_content = f"{self.agent_config['system_role']}\n\nContext: {self.agent_config['context']}\n\nInstructions:\n"
            for instruction in self.agent_config['instructions']:
                system_content += f"- {instruction}\n"
            
            messages = [{"role": "system", "content": system_content}]
            
            # Add conversation context
            for item in context[-5:]:  # Last 5 exchanges
                messages.append({"role": "user", "content": item["query"]})
                messages.append({"role": "assistant", "content": item["response"]})
             
            messages.append({"role": "user", "content": query})
            
            # Single API call with function calling
            completion_args = {
                "model": self.model,
                "messages": messages,
                "max_tokens": 1000,
                "temperature": 0.7
            }
            
            # Add tools if available
            if self.tools:
                completion_args["tools"] = self.tools
                completion_args["tool_choice"] = "auto"
            
            response = self.client.chat.completions.create(**completion_args)
            message = response.choices[0].message
            
            # If no tool calls, return structured JSON with AI response only
            if not hasattr(message, 'tool_calls') or not message.tool_calls:
                response_data = {
                    "query": query,
                    "response_type": "ai_only",
                    "ai_response": message.content,
                    "tools_used": 0,
                    "tool_results": [],
                    "summary": {
                        "total_tools_executed": 0,
                        "tools_executed": []
                    }
                }
                return json.dumps(response_data, indent=2)
            
            # Handle tool calls and generate response in a single call
            tool_results = []
            for tool_call in message.tool_calls:
                tool_name = tool_call.function.name
                tool_args = json.loads(tool_call.function.arguments)
                
                logger.info(f"Executing tool: {tool_name} with args: {tool_args}")
                
                # Execute the tool
                tool_result = execute_tool(tool_name, **tool_args)
                tool_results.append({
                    "tool": tool_name,
                    "result": tool_result
                })
            
            # Return structured JSON response with tool results
            # This gives the caller flexibility to use the data as they wish
            response_data = {
                "query": query,
                "response_type": "tool_enhanced",
                "ai_response": message.content if hasattr(message, 'content') else None,
                "tools_used": len(tool_results),
                "tool_results": tool_results,
                "summary": {
                    "total_tools_executed": len(tool_results),
                    "tools_executed": [result['tool'] for result in tool_results]
                }
            }
            
            return json.dumps(response_data, indent=2)
            
        except Exception as e:
            logger.error(f"OpenAI API error: {str(e)}")
            raise Exception(f"OpenAI API error: {str(e)}")
    
    async def _process_anthropic(self, query: str, context: list) -> str:
        """Process query using Anthropic Claude API"""
        try:
            # Uncomment and modify when using Anthropic
            # conversation = ""
            # for item in context[-5:]:  # Last 5 exchanges
            #     conversation += f"Human: {item['query']}\nAssistant: {item['response']}\n\n"
            # 
            # conversation += f"Human: {query}\nAssistant:"
            # 
            # response = await self.client.completions.create(
            #     model="claude-3-sonnet-20240229",
            #     prompt=conversation,
            #     max_tokens_to_sample=1000,
            #     temperature=0.7
            # )
            # 
            # return response.completion
            
            return f"Anthropic Claude would respond to: {query}"
            
        except Exception as e:
            raise Exception(f"Anthropic API error: {str(e)}")
    
    async def _process_gemini(self, query: str, context: list) -> str:
        """Process query using Google Gemini API"""
        try:
            # Uncomment and modify when using Gemini
            # model = genai.GenerativeModel('gemini-pro')
            # 
            # # Build conversation context
            # conversation_text = ""
            # for item in context[-5:]:
            #     conversation_text += f"User: {item['query']}\nAI: {item['response']}\n\n"
            # 
            # full_prompt = f"{conversation_text}User: {query}\nAI:"
            # 
            # response = await model.generate_content_async(full_prompt)
            # return response.text
            
            return f"Google Gemini would respond to: {query}"
            
        except Exception as e:
            raise Exception(f"Gemini API error: {str(e)}")
    
    async def _process_ollama(self, query: str, context: list) -> str:
        """Process query using local Ollama instance"""
        try:
            # Uncomment and modify when using Ollama
            # import aiohttp
            # 
            # conversation = ""
            # for item in context[-5:]:
            #     conversation += f"User: {item['query']}\nAssistant: {item['response']}\n\n"
            # 
            # prompt = f"{conversation}User: {query}\nAssistant:"
            # 
            # async with aiohttp.ClientSession() as session:
            #     async with session.post(
            #         f"{self.ollama_url}/api/generate",
            #         json={
            #             "model": self.model,
            #             "prompt": prompt,
            #             "stream": False
            #         }
            #     ) as response:
            #         result = await response.json()
            #         return result["response"]
            
            return f"Ollama would respond to: {query}"
            
        except Exception as e:
            raise Exception(f"Ollama API error: {str(e)}")
    
    async def _process_mock(self, query: str, context: list) -> str:
        """Mock AI response for testing purposes"""
        await asyncio.sleep(0.5)  # Simulate processing time
        
        # Simple mock responses based on query content
        query_lower = query.lower()
        
        if "hello" in query_lower or "hi" in query_lower:
            return "Hello! How can I assist you today?"
        elif "weather" in query_lower:
            return "I'd be happy to help with weather information, but I would need access to a weather API to provide current conditions."
        elif "time" in query_lower:
            return f"The current time is {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        elif "help" in query_lower:
            return "I'm an AI assistant ready to help you with various questions and tasks. What would you like to know?"
        elif len(context) > 0:
            return f"Thank you for continuing our conversation. Regarding your question: '{query}' - I understand you're building on our previous discussion."
        else:
            return f"I understand you're asking about: '{query}'. This is a mock response. To get real AI responses, please configure an AI provider (OpenAI, Anthropic, Gemini, or Ollama) by setting the appropriate environment variables."
    
    def get_session_history(self, session_id: str) -> list:
        """Get conversation history for a session"""
        return self.session_history.get(session_id, [])
    
    def clear_session_history(self, session_id: str) -> bool:
        """Clear conversation history for a session"""
        if session_id in self.session_history:
            del self.session_history[session_id]
            return True
        return False