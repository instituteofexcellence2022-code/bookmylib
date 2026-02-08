import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
  Hr,
} from "@react-email/components";
import * as React from "react";

interface AnnouncementEmailProps {
  title: string;
  content: string;
  libraryName: string;
  portalUrl: string;
}

export const AnnouncementEmail = ({
  title,
  content,
  libraryName,
  portalUrl,
}: AnnouncementEmailProps) => {
  const previewText = `New Announcement from ${libraryName}`;

  return (
    <Html>
      <Tailwind>
        <Head />
        <Preview>{previewText}</Preview>
        <Body className="bg-gray-100 my-auto mx-auto font-sans px-2">
          <Container className="bg-white border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px] w-full shadow-sm">
            <Section className="text-center mt-[20px] mb-[20px]">
              <Heading className="text-black text-[24px] font-bold p-0 my-0 mx-0 tracking-tight">
                BookMyLib
              </Heading>
              <Text className="text-gray-500 text-[14px] italic p-0 my-0 mx-0">
                Your Premium Library Experience
              </Text>
            </Section>

            <Section className="px-4">
              <Heading as="h2" className="text-[20px] font-bold text-gray-800 mb-4">
                {title}
              </Heading>
              
              <Text className="text-gray-700 text-[16px] leading-[24px] whitespace-pre-wrap">
                {content}
              </Text>

              <Section className="text-center mt-[32px] mb-[32px]">
                <Button
                  className="bg-black text-white rounded px-6 py-3 font-semibold text-[14px] no-underline hover:bg-gray-800 transition-colors"
                  href={portalUrl}
                >
                  View in Portal
                </Button>
              </Section>
            </Section>

            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />

            <Section className="text-center">
              <Text className="text-[#666666] text-[12px] leading-[24px]">
                You are receiving this email because you are a member of {libraryName}.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AnnouncementEmail;
