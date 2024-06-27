import {Box} from "@chakra-ui/react";
import Lottie from "lottie-react";
import loadingDotsAnimation from "../assets/loading-dots.json";

const ChatBubble = ({role, children, ...props}) => {
	const userStyles = {
		backgroundColor: "blue.300",
		color: "white",
		borderBottomRightRadius: "0",
		alignSelf: "end"
	};
	const botStyles = {
		backgroundColor: "gray.300",
		color: "black",
		borderBottomLeftRadius: "0",
		alignSelf: "start"
	};
	const errorStyles = {
		color: "red.500",
		textAlign: "center",
		width: "100%",
		alignSelf: "center"
	}
	const systemStyles = {
		color: "gray.500",
		textAlign: "center",
		width: "100%",
		alignSelf: "center"
	}

	return <Box
		maxW="80%"
		padding="1em"
		margin=".5em"
		borderRadius="1em"
		{...(
			role === "user" ? userStyles
			: role === "bot" ? botStyles
			: role === "error" ? errorStyles
			: systemStyles
		)}
		{...props}
	>
		{children}
	</Box>;
};

const LoadingBubble = () => {
	return <ChatBubble role="bot" height="4em" py="0" backgroundColor="gray.500">
		<Lottie animationData={loadingDotsAnimation} className="h-full"/>
	</ChatBubble>
}

export default ChatBubble;
export {LoadingBubble};
