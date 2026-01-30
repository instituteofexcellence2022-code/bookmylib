import {
  Body,
  Container,
  Head,
  Heading,
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
  branchName?: string;
}

export const TicketUpdateEmail = ({
  studentName,
  ticketId,
  ticketSubject,
  status,
  updatedBy,
  comment,
  actionLink = "https://bookmylib.com/student/issues",
  type,
  branchName,
}: TicketUpdateEmailProps) => {
  const shortId = ticketId.slice(0, 8).toUpperCase();
  
  let previewText = "";
  let title = "";
  let bannerColor = "bg-blue-50 border-blue-100 text-blue-700";
  
  switch (type) {
    case 'status_change':
      previewText = `Ticket #${shortId} status updated to ${status}`;
      title = "Status Update";
      if (status === 'closed' || status === 'resolved') {
        bannerColor = "bg-green-50 border-green-100 text-green-700";
      } else if (status === 'in_progress') {
        bannerColor = "bg-yellow-50 border-yellow-100 text-yellow-700";
      }
      break;
    case 'new_comment':
      previewText = `New reply on Ticket #${shortId}`;
      title = "New Reply";
      break;
    case 'created':
        previewText = `Ticket #${shortId} Created Successfully`;
        title = "Ticket Received";
        bannerColor = "bg-green-50 border-green-100 text-green-700";
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
        <Body className="bg-gray-100 my-auto mx-auto font-sans px-2">
          <Container className="bg-white border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px] w-full shadow-sm">
             {/* Header */}
            <Section className="text-center mt-[20px] mb-[20px]">
              <Heading className="text-black text-[24px] font-bold p-0 my-0 mx-0 tracking-tight">
                BookMyLib
              </Heading>
              <Text className="text-gray-500 text-[14px] italic p-0 my-0 mx-0">
                Your Premium Library Experience
              </Text>
            </Section>

            <Hr className="border-t border-gray-200 my-4" />

            {/* Status Banner */}
            <Section className={`text-center p-4 rounded-lg mb-[24px] border ${bannerColor}`}>
              <Heading className="text-[18px] font-semibold m-0">
                {title}
              </Heading>
              <Text className="text-[13px] m-0 mt-1 opacity-90">
                Ticket #{shortId}
              </Text>
            </Section>
            
            <Section className="mb-[24px] px-2">
               <Text className="text-gray-700 text-[15px] leading-[24px]">
                Hi <strong>{studentName}</strong>,
              </Text>
              <Text className="text-gray-700 text-[15px] leading-[24px]">
                There has been an update regarding your support ticket.
              </Text>
            </Section>

            {/* Ticket Details */}
            <Section className="border border-solid border-gray-200 rounded-lg overflow-hidden mb-[32px]">
                <div className="bg-gray-50 p-3 border-b border-gray-200">
                    <Text className="text-gray-500 text-[12px] font-semibold uppercase tracking-wider m-0">
                        Ticket Details
                    </Text>
                </div>
                <div className="p-4">
                    <Row className="mb-3">
                        <Column>
                            <Text className="text-gray-500 text-[12px] uppercase tracking-wider mb-1">Subject</Text>
                            <Text className="text-black text-[14px] font-medium m-0">{ticketSubject}</Text>
                        </Column>
                    </Row>
                    <Row>
                        <Column>
                            <Text className="text-gray-500 text-[12px] uppercase tracking-wider mb-1">Status</Text>
                            <Text className="text-black text-[14px] font-medium m-0 capitalize px-2 py-1 bg-gray-100 rounded inline-block text-[12px]">
                                {status || 'Active'}
                            </Text>
                        </Column>
                         <Column align="right">
                            <Text className="text-gray-500 text-[12px] uppercase tracking-wider mb-1">Ticket ID</Text>
                            <Text className="text-gray-600 text-[14px] font-mono m-0">#{shortId}</Text>
                        </Column>
                    </Row>
                </div>
            </Section>

            {comment && (
                 <Section className="mb-[32px] px-2">
                    <Text className="text-gray-500 text-[12px] uppercase tracking-wider mb-2 font-semibold">
                        Latest Reply {updatedBy ? `from ${updatedBy}` : ''}:
                    </Text>
                    <div className="bg-gray-50 border-l-4 border-gray-300 p-4 rounded-r">
                        <Text className="text-gray-800 text-[14px] leading-[24px] italic m-0">
                            "{comment}"
                        </Text>
                    </div>
                 </Section>
            )}

            <Section className="text-center mb-[32px]">
              <Button
                className="bg-black text-white rounded px-6 py-3 font-semibold text-[14px] no-underline hover:bg-gray-800 transition-colors"
                href={actionLink}
              >
                View Ticket & Reply
              </Button>
            </Section>

            <Hr className="border-t border-gray-200 my-6" />

            {/* Footer */}
            <Section className="text-center mt-[20px]">
                <Text className="text-gray-500 text-[12px] mb-2">
                    Powered by <strong>BookMyLib</strong>
                </Text>
                {branchName && (
                    <Text className="text-gray-400 text-[12px] mb-1">
                        Sent from {branchName}
                    </Text>
                )}
                <Text className="text-gray-400 text-[11px] mt-2">
                    Please do not reply directly to this email. Use the button above to respond.
                </Text>
                 <Text className="text-gray-300 text-[10px] mt-4">
                    © {new Date().getFullYear()} BookMyLib. All rights reserved.
                </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default TicketUpdateEmail;
