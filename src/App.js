import React, { useEffect, useState } from "react";
import styled, {
  keyframes,
  StyleSheetManager,
  createGlobalStyle
} from "styled-components";
import isPropValid from "@emotion/is-prop-valid";

const GlobalStyle = createGlobalStyle`
  html, body {
    overflow: hidden;
    margin: 0;
    padding: 0;
    height: 100%;
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  ::-webkit-scrollbar {
    display: none;  /* Chrome, Safari and Opera */
  }
`;

const slideDown = keyframes`
  from {
    transform: translateY(-11rem);
  }
  to {
    transform: translateY(0);
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2.125rem;
  width: calc(100vw - 4rem);
  height: calc(100vh - 4rem);
  padding: 2rem;
  overflow: hidden;
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
  &::-webkit-scrollbar {
    display: none; /* Chrome, Safari and Opera */
  }
`;

const ConnectionStatus = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
`;

const StatusText = styled.p`
  font-size: 2rem;
  color: rgba(255, 255, 255, 0.5);
`;

const VoteItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const NewVoteItem = styled(VoteItem)`
  animation: ${fadeIn} 0.5s cubic-bezier(0, 0, 0.2, 1) 0.2s forwards;
  opacity: 0;
`;

const VoteItemsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2.125rem;
  animation: ${(props) => (props.isNewItem ? slideDown : "none")} 0.5s
    cubic-bezier(0, 0, 0.2, 1) forwards;
`;

const OptionsContainer = styled.div`
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  height: 11rem;
`;

const Option = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
`;

const ImageContainer = styled.div`
  height: 100%;
  min-width: 11rem;
  min-height: 11rem;
  border-radius: ${(props) =>
    props.percentage === 0
      ? "0.75rem"
      : props.left
      ? "0.75rem 0 0 0.75rem"
      : "0 0.75rem 0.75rem 0"};
  overflow: hidden;
  position: relative;
`;

const OptionImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const BarContainer = styled.div`
  height: 100%;
  overflow: hidden;
  position: relative;
  flex: 1;
  display: flex;
  gap: 2rem;
`;

const BlurredBackground = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url(${(props) => props.imageUrl});
  background-size: cover;
  background-position: center;
  filter: blur(50px) brightness(0.8);
  transform: scale(2);
  width: 100%;
  height: 100%;
  min-width: 200px;
  min-height: 100px;
  z-index: 0;

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
  }
`;

const Bar = styled.div`
  height: 100%;
  width: ${(props) => props.percentage}%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  overflow: hidden;
  ${(props) =>
    props.left
      ? `
      border-top-right-radius: 1rem;
      border-bottom-right-radius: 1rem;
    `
      : `
      border-top-left-radius: 1rem;
      border-bottom-left-radius: 1rem;
    `}
  ${(props) =>
    props.percentage === 0 &&
    `
    background-color: transparent;
  `}
`;

const BarLabel = styled.div`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  color: white;
  font-weight: bold;
  font-size: 1.5rem;
  z-index: 2;
  ${(props) => (props.left ? "left: 1.5rem;" : "right: 1.5rem;")}
  ${(props) => props.percentage === 0 && "display: none;"}
`;

const WebSocketConnection = () => {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [pairs, setPairs] = useState([]);
  const [isNewItem, setIsNewItem] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [isInitialConnection, setIsInitialConnection] = useState(true);
  const [pendingVote, setPendingVote] = useState(null);

  const preloadImages = (urls) => {
    return Promise.all(
      urls.map(
        (url) =>
          new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
          })
      )
    );
  };

  const handleNewVote = async (data) => {
    try {
      // Preload both images
      await preloadImages([data.option_1.url, data.option_2.url]);

      // Once images are loaded, update the state
      setPairs((prevPairs) => {
        const newPairs = [data, ...prevPairs];
        return newPairs.slice(0, 6);
      });
      setIsNewItem(true);
      setTimeout(() => setIsNewItem(false), 500);
    } catch (error) {
      console.error("Error preloading images:", error);
    }
  };

  const connectWebSocket = () => {
    // Create WebSocket connection
    const ws = new WebSocket(
      "wss://socket.this-or-that-machine-server.noshado.ws"
    );

    // Connection opened
    ws.onopen = () => {
      setConnectionStatus("connected");
      setReconnectAttempt(0);
      setIsInitialConnection(false);
    };

    // Listen for messages
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "vote") {
          handleNewVote(data.data);
        }
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    };

    // Connection error
    ws.onerror = (error) => {
      setConnectionStatus("error");
      console.error("WebSocket error:", error);
      console.error("Error event:", {
        type: error.type,
        target: error.target,
        currentTarget: error.currentTarget
      });
    };

    // Connection closed
    ws.onclose = (event) => {
      setConnectionStatus("disconnected");

      // Attempt to reconnect with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 30000);
      setTimeout(() => {
        setReconnectAttempt((prev) => prev + 1);
        connectWebSocket();
      }, delay);
    };

    setSocket(ws);
  };

  useEffect(() => {
    connectWebSocket();

    // Cleanup function
    return () => {
      if (socket) {
        socket.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StyleSheetManager shouldForwardProp={isPropValid}>
      <GlobalStyle />
      <Page>
        {isInitialConnection && connectionStatus === "disconnected" ? (
          <ConnectionStatus>
            <StatusText>Connecting to server...</StatusText>
          </ConnectionStatus>
        ) : connectionStatus === "error" ? (
          <ConnectionStatus>
            <StatusText>
              Connection error. Attempting to reconnect...
            </StatusText>
          </ConnectionStatus>
        ) : pairs.length === 0 ? (
          <ConnectionStatus>
            <StatusText>Waiting for votes...</StatusText>
          </ConnectionStatus>
        ) : (
          <VoteItemsContainer isNewItem={isNewItem}>
            {pairs.map((pair, index) => {
              const totalVotes = pair.option_1.count + pair.option_2.count;
              const option1Percentage =
                totalVotes > 0
                  ? Math.round((pair.option_1.count / totalVotes) * 100)
                  : 0;
              const option2Percentage =
                totalVotes > 0
                  ? Math.round((pair.option_2.count / totalVotes) * 100)
                  : 0;

              const VoteItemComponent = index === 0 ? NewVoteItem : VoteItem;

              return (
                <VoteItemComponent key={pair.pair_id}>
                  <OptionsContainer>
                    <Option>
                      <ImageContainer left percentage={option1Percentage}>
                        <OptionImage
                          src={pair.option_1.url}
                          alt={pair.option_1.value}
                        />
                      </ImageContainer>
                    </Option>
                    {totalVotes > 0 ? (
                      <BarContainer>
                        <Bar percentage={option1Percentage} left>
                          <BlurredBackground imageUrl={pair.option_1.url} />
                          <BarLabel left percentage={option1Percentage}>
                            {option1Percentage}%
                          </BarLabel>
                        </Bar>
                        <Bar percentage={option2Percentage}>
                          <BlurredBackground imageUrl={pair.option_2.url} />
                          <BarLabel percentage={option2Percentage}>
                            {option2Percentage}%
                          </BarLabel>
                        </Bar>
                      </BarContainer>
                    ) : (
                      <BarContainer>
                        <Bar percentage={0} left>
                          <BarLabel left>0%</BarLabel>
                        </Bar>
                        <Bar percentage={0}>
                          <BarLabel>0%</BarLabel>
                        </Bar>
                      </BarContainer>
                    )}
                    <Option>
                      <ImageContainer percentage={option2Percentage}>
                        <OptionImage
                          src={pair.option_2.url}
                          alt={pair.option_2.value}
                        />
                      </ImageContainer>
                    </Option>
                  </OptionsContainer>
                </VoteItemComponent>
              );
            })}
          </VoteItemsContainer>
        )}
      </Page>
    </StyleSheetManager>
  );
};

export default WebSocketConnection;
