import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
  Button,
  Hr,
} from "@react-email/components";
import * as React from "react";

interface WelcomeEmailProps {
  studentName: string;
  loginUrl: string;
}

export const WelcomeEmail = ({
  studentName,
  loginUrl,
}: WelcomeEmailProps) => {
  const previewText = `Welcome to Library App!`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
            <Section className="mt-[32px] text-center">
              <Heading className="text-black text-[24px] font-normal p-0 my-[30px] mx-0">
                Welcome to Library App!
              </Heading>
            </Section>
            <Section className="mb-[32px]">
              <Text className="text-black text-[14px] leading-[24px]">
                Hello <strong>{studentName}</strong>,
              </Text>
              <Text className="text-black text-[14px] leading-[24px]">
                We're excited to have you on board! Your account has been successfully created.
              </Text>
              <Text className="text-black text-[14px] leading-[24px]">
                You can now log in to your student portal to manage your subscriptions, view your attendance, and more.
              </Text>
            </Section>
            <Section className="text-center mb-[32px]">
              <Button
                className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                href={loginUrl}
              >
                Login to Dashboard
              </Button>
            </Section>
            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
            <Section className="text-center">
              <Text className="text-gray-500 text-[12px]">
                If you have any questions, feel free to reply to this email.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default WelcomeEmail;
