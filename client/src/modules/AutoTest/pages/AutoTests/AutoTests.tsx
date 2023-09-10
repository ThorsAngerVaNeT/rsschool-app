import { useMemo, useState } from 'react';
import { PageLayout } from 'components/PageLayout';
import { CoursePageProps } from 'services/models';
import { StatusTabs, TaskCard } from 'modules/AutoTest/components';
import { Col, Row } from 'antd';
import { CourseTaskDetailedDto } from 'api';
import { ColProps } from 'antd/lib/grid';
import { useCourseTaskVerifications } from 'modules/AutoTest/hooks';
import { CourseTaskStatus } from 'modules/AutoTest/types';

export interface AutoTestsProps extends CoursePageProps {
  courseTasks: CourseTaskDetailedDto[];
}

const RESPONSIVE_COLUMNS: ColProps = {
  sm: 24,
  md: 12,
  lg: 8,
  xl: 8,
  xxl: 6,
};

function AutoTests({ course, courseTasks }: AutoTestsProps) {
  const { tasks } = useCourseTaskVerifications(course.id, courseTasks);
  const [activeTab, setActiveTab] = useState(CourseTaskStatus.Available);
  const statuses = useMemo(() => tasks?.map(t => t.status) || [], [tasks]);
  const filteredTasks = useMemo(() => tasks?.filter(t => t.status === activeTab) || [], [tasks, activeTab]);

  return (
    <PageLayout loading={false} title="Auto-tests" background="#F0F2F5" withMargin={false} showCourseName>
      <Row gutter={24} style={{ background: 'white', marginRight: 0, marginBottom: 24, padding: '0 16px' }}>
        <Col span={24}>
          <StatusTabs statuses={statuses} activeTab={activeTab} onTabChange={setActiveTab} />
        </Col>
      </Row>
      <Row gutter={[24, 24]} style={{ padding: '0 16px', marginRight: 0 }}>
        {filteredTasks.map(courseTask => (
          <Col {...RESPONSIVE_COLUMNS} key={courseTask.id}>
            <TaskCard courseTask={courseTask} course={course} />
          </Col>
        ))}
      </Row>
    </PageLayout>
  );
}

export default AutoTests;
