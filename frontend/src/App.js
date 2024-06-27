import {Button, Flex, Input, InputGroup, InputLeftAddon} from "@chakra-ui/react";
import axios from "axios";
import {useEffect, useRef, useState} from "react";
import {FaArrowUp} from "react-icons/fa";
import {useDebounce} from "use-debounce";
import ChatBubble, {LoadingBubble} from "./components/ChatBubble";
import {ColorModeSwitcher} from "./components/ColorModeSwitcher";
import logo from './logo.svg';
import './App.css';

function App() {
    const [keyword, setKeyword] = useState("");
    const [msg, setMsg] = useState("");
    const [law, setLaw] = useState("");
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    const chatRef = useRef(null);

    const [debouncedKeyword] = useDebounce(keyword, 800);

    useEffect(() => {
        const fetchLaw = async () => {
            try {
                const url = (await axios.get("https://customsearch.googleapis.com/customsearch/v1", {
                    params: {
                        key: GOOGLE_API_KEY,
                        cx: "100df7b1081ac4a72",
                        q: debouncedKeyword
                    }
                })).data.items[0].link;
                console.log(url)

                const text = (await axios.get("http://localhost:5000/scrape", {
                    "params": {"url": url}
                })).data;

                setLaw(text);

                let histCopy = [...history];
                const lastMessage = histCopy.pop();
                if (lastMessage && lastMessage.role === "system") {
                    setHistory([...histCopy, {
                        role: "system",
                        text: `Now chatting about ${debouncedKeyword}`
                    }]);
                } else {
                    setHistory([...history, {
                        role: "system",
                        text: `Now chatting about ${debouncedKeyword}`
                    }]);
                }
            } catch (e) {
                console.log(e);
                setHistory([...history, {
                    role: "error",
                    text: `No search results for ${debouncedKeyword}`
                }]);
            }
        }

        if (debouncedKeyword) {
            fetchLaw();
        }
    }, [debouncedKeyword])

    useEffect(() => {
        if (history.length && chatRef.current && chatRef.current.lastChild) {
            chatRef.current.lastChild.scrollIntoView();
        }
    }, [chatRef, history]);

    const sendMessage = async () => {
        setLoading(true);
        let histCopy = [...history];
        histCopy.push({
            role: "user",
            text: msg,
        });
        setHistory(histCopy);

        const n = (await axios.get("https://pathlit.com/api/api/v1/deployments/e0ee0568-e8e5-421f-80da-b5fc5cf97f13/run_history")).data.length;
        await axios.post("https://pathlit.com/api/api/v1/deployments/e0ee0568-e8e5-421f-80da-b5fc5cf97f13/run", {
            "Question": msg,
            "Context": law,
        }, {
            headers: {
                "Authorization": "Bearer PATHLIT_KEY",
                "Content-Type": "application/json",
            }
        });
        const output = (await pollUntilNewRun("https://pathlit.com/api/api/v1/deployments/e0ee0568-e8e5-421f-80da-b5fc5cf97f13/run_history", n))
        .data.at(-1)["results"]["out-0"]["outputs"]["output"];
        console.log(output);

        setHistory([...histCopy, {
            role: "bot",
            text: output
        }]);
        setLoading(false);
    }

    const pollUntilNewRun = async (url, n) => {
        let run_history = await axios.get(url);
        let i = 0;
        for (; i < 20 && (run_history.data.length <= n || run_history.data && run_history.data.at(-1)["results"]["out-0"]["status"] === "PENDING"); i++) {
            console.log("poll");
            await sleep();
            run_history = await axios.get(url);
        }
        if (i == 20) {
            console.log("failed to fetch result");
        }
        console.log(n, run_history.data.length)
        console.log(run_history);
        return run_history;
    }

    const sleep = (ms = 500) => {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    return (
        <Flex h="100vh" justify="center" align="center" flexDirection="row">
            <Flex flexDirection="column" w="xl" h="80%" padding="3em" backgroundColor="#ffffff22" borderRadius="2em">
                <Flex flexDirection="row" w="100%" gap="2">
                    <Flex flex="1">
                        <Input value={keyword} onChange={ev => setKeyword(ev.target.value)}
                               placeholder="Keyword or Statue Code" textAlign="center" borderWidth="3px"
                               padding="1em" borderRadius="3em"
                        />
                    </Flex>
                    <ColorModeSwitcher />
                </Flex>
                <Flex ref={chatRef} flexDirection="column" flex="1" overflowY="auto" my=".8em" className="fade-y"
                      py=".8em">
                    {history.length
                        ? history.map((h, i) => <ChatBubble key={i} role={h.role}>{h.text}</ChatBubble>)
                        : <Flex alignSelf="center" mt="30%" color="gray.400">Enter a key word and a question to start chatting!</Flex>
                    }
                    {loading && <LoadingBubble />}
                </Flex>
                <Flex as="form" flexDirection="row" gap="2" w="100%" onSubmit={ev => {
                    ev.preventDefault();
                    sendMessage();
                }} disabled={keyword.length === 0 || msg.length === 0 || loading}>
                    <Input borderRadius="3em" value={msg} onChange={ev => setMsg(ev.target.value)} borderWidth="3px"
                           padding="1em" flex="1"
                           isDisabled={loading}
                    />
                    <Button type="submit" onClick={sendMessage} borderRadius="3em"
                            isDisabled={keyword.length === 0 || msg.length === 0 || loading}>
                        <FaArrowUp />
                    </Button>
                </Flex>
            </Flex>
            {law && <Flex opacity=".8" overflowY="auto" w="40%" h="80%" p="2em">
                {law}
            </Flex>}
        </Flex>
    );
}

export default App;
