import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Button,
  Tailwind,
  Row,
  Column,
} from "@react-email/components";
import * as React from "react";

interface TicketUpdateEmailProps {
  studentName: string;
  ticketId: string;
  ticketSubject: string;
  status?: string;
  updatedBy?: string;
  comment?: string;
  actionLink?: string;
  type: 'status_change' | 'new_comment' | 'created';
}

export const TicketUpdateEmail = ({
  studentName,
  ticketId,
  ticketSubject,
  status,
  updatedBy,
  comment,
  actionLink = "https://library-app.com/student/issues",
  type,
}: TicketUpdateEmailProps) => {
  const shortId = ticketId.slice(0, 8).toUpperCase();
  
  let previewText = "";
  let title = "";
  
  switch (type) {
    case 'status_change':
      previewText = `Ticket #${shortId} status updated to ${status}`;
      title = "Ticket Status Updated";
      break;
    case 'new_comment':
      previewText = `New reply on Ticket #${shortId}`;
      title = "New Reply on Ticket";
      break;
    case 'created':
        previewText = `Ticket #${shortId} Created Successfully`;
        title = "Ticket Received";
        break;
    default:
      previewText = `Update on Ticket #${shortId}`;
      title = "Ticket Update";
  }

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
            <Section className="mt-[32px]">
              <Text className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
                {title}
              </Text>
            </Section>
            
            <Section className="mb-[32px]">
               <Text className="text-black text-[14px] leading-[24px]">
                Hello <strong>{studentName}</strong>,
              </Text>
              <Text className="text-black text-[14px] leading-[24px]">
                There has been an update regarding your support ticket:
              </Text>
            </Section>

            <Section className="border border-solid border-[#eaeaea] rounded-lg p-4 bg-gray-50 mb-[32px]">
                <Row className="mb-2">
                    <Column>
                        <Text className="text-gray-500 text-[12px] uppercase tracking-wider mb-1">Ticket ID</Text>
                        <Text className="text-black text-[14px] font-medium m-0">#{shortId}</Text>
                    </Column>
                     <Column align="right">
                        <Text className="text-gray-500 text-[12px] uppercase tracking-wider mb-1">Status</Text>
                        <Text className="text-black text-[14px] font-medium m-0 capitalize">{status || 'Active'}</Text>
                    </Column>
                </Row>
                <Row>
                    <Column>
                        <Text className="text-gray-500 text-[12px] uppercase tracking-wider mb-1 mt-2">Subject</Text>
                        <Text className="text-black text-[14px] font-medium m-0">{ticketSubject}</Text>
                    </Column>
                </Row>
            </Section>

            {comment && (
                 <Section className="mb-[32px]">
                    <Text className="text-gray-500 text-[12px] uppercase tracking-wider mb-1">
                        Latest Reply {updatedBy ? `from ${updatedBy}` : ''}:
                    </Text>
                    <Text className="text-black text-[14px] leading-[24px] italic border-l-4 border-gray-300 pl-4 py-2 bg-gray-50">
                        "{comment}"
                    </Text>
                 </Section>
            )}

            <Section className="text-center mb-[32px]">
              <Button
                className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                href={actionLink}
              >
                View Ticket
              </Button>
            </Section>

            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />

            <Section className="text-center">
                <Text className="text-gray-500 text-[12px]">
                    Please do not reply directly to this email. Use the button above to respond.
                </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default TicketUpdateEmail;
