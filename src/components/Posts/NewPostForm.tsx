import { Post } from "@/src/atoms/postsAtom";
import { firestore, storage } from "@/src/firebase/clientApp";
import useSelectFile from "@/src/hooks/useSelectFile";
import { Alert, AlertIcon, Flex, Icon, Text } from "@chakra-ui/react";
import { User } from "firebase/auth";
import { addDoc, collection, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { BiPoll } from "react-icons/bi";
import { BsLink45Deg, BsMic } from "react-icons/bs";
import { IoDocumentText, IoImageOutline } from "react-icons/io5";
import ImageUpload from "./PostForm/ImageUpload";
import TextInputs from "./PostForm/TextInputs";
import PostItem from "./PostItem";
import Posts from "./Posts";
import TabItem from "./TabItem";

type NewPostFormProps = {
	user: User;
	communityImageURL?: string;
};

const formTabs: TabItems[] = [
	{
		title: "Post",
		icon: IoDocumentText,
	},
	{
		title: "Images & Video",
		icon: IoImageOutline,
	},
	{
		title: "Link",
		icon: BsLink45Deg,
	},
	{
		title: "Poll",
		icon: BiPoll,
	},
	{
		title: "Talk",
		icon: BsMic,
	},
];

export type TabItems = {
	title: string;
	icon: typeof Icon.arguments;
};

const NewPostForm: React.FC<NewPostFormProps> = ({ user, communityImageURL }) => {
	const router = useRouter();

	const [selectedTab, setSelectedTab] = useState(formTabs[0].title);
	const [textInputs, setTextInputs] = useState({
		title: "",
		body: "",
	});

	const { selectedFile, setSelectedFile, onSelectFile } = useSelectFile();

	const [loading, setLoading] = useState(false);

	const [error, setError] = useState(false);

	const handleCreatePost = async () => {
		const { communityId, id } = router.query;

		// create a new post object
		const newPost: Post = {
			communityId: communityId as string,
			communityImageURL: communityImageURL || "",
			creatorId: user.uid,
			creatorDisplayName: user.email!.split("@")[0],
			title: textInputs.title,
			body: textInputs.body,
			numberOfComments: 0,
			voteStatus: 0,
			createdAt: serverTimestamp() as Timestamp,
			// id: id, // something maybe wrong here
		};

		setLoading(true);

		try {
			const postDocRef = await addDoc(collection(firestore, "posts"), newPost);

			// check for selectedFile and store in db if true store the post in db
			if (selectedFile) {
				// store in firestore storage
				const imageRef = ref(storage, `posts/${postDocRef.id}/image`);
				await uploadString(imageRef, selectedFile, "data_url");
				const downloadURL = await getDownloadURL(imageRef);

				// update post doc by adding imageURL
				await updateDoc(postDocRef, {
					imageURL: downloadURL,
				});
			}

			// redirect user to community page
			router.back();
		} catch (error: any) {
			console.log("handleCreatePost error: ", error.message);
			setError(true);
		}

		setLoading(false);
	};

	const onTextChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		const {
			target: { name, value },
		} = event;
		setTextInputs((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	return (
		<Flex direction="column" bg="white" borderRadius={4} mt={2}>
			<Flex width="100%">
				{formTabs.map((item) => (
					<TabItem item={item} key={item.title} selected={item.title === selectedTab} setSelectedTab={setSelectedTab} />
				))}
			</Flex>

			<Flex p={4}>
				{selectedTab === "Post" && <TextInputs textInputs={textInputs} handleCreatePost={handleCreatePost} onChange={onTextChange} loading={loading} />}
				{selectedTab === "Images & Video" && <ImageUpload selectedFile={selectedFile} onSelectImage={onSelectFile} setSelectedTab={setSelectedTab} setSelectedFile={setSelectedFile} />}
			</Flex>
			{error && (
				<Alert status="error">
					<AlertIcon />
					<Text mr={2}>Error creating post</Text>
				</Alert>
			)}
		</Flex>
	);
};
export default NewPostForm;
