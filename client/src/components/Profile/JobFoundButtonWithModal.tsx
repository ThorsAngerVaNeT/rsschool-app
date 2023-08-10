import { Button, Col, Input, Row, Typography } from 'antd';
import ProfileSettingsModal from './ProfileSettingsModal';
import { useState } from 'react';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { Checkbox } from 'antd/lib';
import { JobFound } from 'common/models';

const { Paragraph, Text } = Typography;

const JobFoundButtonWithModal = ({ jobFound = false, jobFoundCompanyName = '', jobFoundOfficeLocation = '' }: JobFound) => {
  const [isJobFoundModalVisible, setIsJobFoundModalVisible] = useState(false);
  const [checked, setChecked] = useState(true);

  const title = `I've got a job`;

  const showJobFoundModal = () => {
    setIsJobFoundModalVisible(true);
  };

  const hideJobFoundModal = () => {
    setIsJobFoundModalVisible(false);
  };

  const onCancel = () => hideJobFoundModal()

  const onSave = () => alert('done')

  const onChange = (e: CheckboxChangeEvent) => {
    setChecked(e.target.checked);
  };

  return (
    <>
      <Paragraph style={{ textAlign: 'center', margin: 0 }}>
        <Button type="primary" style={{ marginTop: 20 }} onClick={showJobFoundModal}>
          {title}
        </Button>
      </Paragraph>
      <ProfileSettingsModal
        isSettingsVisible={isJobFoundModalVisible}
        onCancel={onCancel}
        settingsTitle={title}
        onSave={onSave}
        // isSaveDisabled={isSaveDisabled}
        content={
          <Row>
            <Col style={{ width: '100%' }}>
              <Row>
                <Checkbox checked={jobFound} onChange={onChange}>
                  {title}
                </Checkbox>
              </Row>
              <Row>
                <Text strong>Company Name</Text>
              </Row>
              <Row style={{ marginTop: 4 }}>
                <Input value={jobFoundCompanyName} placeholder="Company Name" />
              </Row>
              <Row style={{ marginTop: 24 }}>
                <Text strong>Office Location</Text>
              </Row>
              <Row style={{ marginTop: 4 }}>
                <Input value={jobFoundOfficeLocation} placeholder="Minsk, Belarus" />
              </Row>
            </Col>
          </Row>
        }
      />
    </>
  );
};

export default JobFoundButtonWithModal;
