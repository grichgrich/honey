import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { analytics } from '../../systems/Analytics';

interface HelpTopic {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  relatedTopics: string[];
  lastUpdated: number;
}

interface HelpCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const HelpContainer = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  z-index: 1000;
  color: white;
  overflow: hidden;
`;

const Sidebar = styled.div`
  width: 300px;
  background: rgba(20, 30, 50, 0.95);
  border-right: 1px solid rgba(68, 68, 255, 0.2);
  padding: 20px;
  display: flex;
  flex-direction: column;
`;

const SearchBar = styled.div`
  margin-bottom: 20px;

  input {
    width: 100%;
    padding: 10px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(68, 68, 255, 0.3);
    border-radius: 6px;
    color: white;
    outline: none;

    &:focus {
      border-color: #44f;
    }
  }
`;

const CategoryList = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const CategoryItem = styled.div<{ active: boolean }>`
  padding: 12px;
  margin-bottom: 8px;
  background: ${props => props.active ? 'rgba(68, 68, 255, 0.2)' : 'transparent'};
  border: 1px solid ${props => props.active ? '#44f' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(68, 68, 255, 0.1);
    border-color: #44f;
  }

  h3 {
    margin: 0 0 5px 0;
    color: ${props => props.active ? '#fff' : '#aaa'};
    font-size: 1.1em;
  }

  p {
    margin: 0;
    font-size: 0.9em;
    color: ${props => props.active ? '#ccc' : '#888'};
  }
`;

const Content = styled.div`
  flex: 1;
  padding: 30px;
  overflow-y: auto;
`;

const TopicList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const TopicCard = styled(motion.div)`
  background: rgba(20, 30, 50, 0.95);
  border: 1px solid rgba(68, 68, 255, 0.2);
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(20, 30, 50, 0.8);
    border-color: #44f;
    transform: translateY(-2px);
  }

  h3 {
    margin: 0 0 10px 0;
    color: #44f;
  }

  p {
    margin: 0;
    color: #aaa;
    font-size: 0.9em;
  }
`;

const TopicContent = styled(motion.div)`
  background: rgba(20, 30, 50, 0.95);
  border: 1px solid rgba(68, 68, 255, 0.2);
  border-radius: 12px;
  padding: 30px;
  max-width: 800px;
  margin: 0 auto;

  h2 {
    margin: 0 0 20px 0;
    color: #44f;
    font-size: 1.6em;
  }

  .content {
    color: #ccc;
    line-height: 1.8;
    font-size: 1.1em;
  }
`;

const TagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 15px 0;
`;

const Tag = styled.span`
  background: rgba(68, 68, 255, 0.1);
  border: 1px solid #44f;
  color: #44f;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9em;
`;

const RelatedTopics = styled.div`
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);

  h4 {
    color: #aaa;
    margin: 0 0 10px 0;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  li {
    background: rgba(0, 0, 0, 0.2);
    padding: 8px 12px;
    border-radius: 4px;
    color: #44f;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(68, 68, 255, 0.1);
    }
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: transparent;
  border: none;
  color: #aaa;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: white;
    transform: scale(1.1);
  }
`;

interface HelpSystemProps {
  onClose: () => void;
}

const HelpSystem: React.FC<HelpSystemProps> = ({ onClose }) => {
  const [categories] = useState<HelpCategory[]>([
    {
      id: 'getting-started',
      name: 'Getting Started',
      icon: '🚀',
      description: 'Learn the basics of the game'
    },
    {
      id: 'resources',
      name: 'Resources & Economy',
      icon: '💎',
      description: 'Understanding resources and the economy'
    },
    {
      id: 'combat',
      name: 'Combat & Defense',
      icon: '⚔️',
      description: 'Combat mechanics and defense strategies'
    },
    {
      id: 'missions',
      name: 'Missions & Quests',
      icon: '📜',
      description: 'Mission system and rewards'
    },
    {
      id: 'territories',
      name: 'Territories',
      icon: '🏰',
      description: 'Territory control and management'
    }
  ]);

  const [topics] = useState<HelpTopic[]>([
    {
      id: 'basic-controls',
      title: 'Basic Controls',
      content: `Learn how to navigate and control your character in the game world...`,
      category: 'getting-started',
      tags: ['controls', 'movement', 'camera'],
      relatedTopics: ['user-interface', 'keyboard-shortcuts'],
      lastUpdated: Date.now()
    },
    // Add more topics...
  ]);

  const [selectedCategory, setSelectedCategory] = useState<string>('getting-started');
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    analytics.trackEvent('help', 'open', selectedCategory);
  }, []);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedTopic(null);
    analytics.trackEvent('help', 'category_select', categoryId);
  };

  const handleTopicSelect = (topic: HelpTopic) => {
    setSelectedTopic(topic);
    analytics.trackEvent('help', 'topic_view', topic.id);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    analytics.trackEvent('help', 'search', query);
  };

  const filteredTopics = topics.filter(topic => {
    if (!searchQuery) return topic.category === selectedCategory;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      topic.title.toLowerCase().includes(searchLower) ||
      topic.content.toLowerCase().includes(searchLower) ||
      topic.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  });

  return (
    <HelpContainer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Sidebar>
        <SearchBar>
          <input
            type="text"
            placeholder="Search help topics..."
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
          />
        </SearchBar>

        <CategoryList>
          {categories.map(category => (
            <CategoryItem
              key={category.id}
              active={category.id === selectedCategory}
              onClick={() => handleCategorySelect(category.id)}
            >
              <h3>{category.icon} {category.name}</h3>
              <p>{category.description}</p>
            </CategoryItem>
          ))}
        </CategoryList>
      </Sidebar>

      <Content>
        <CloseButton onClick={onClose}>&times;</CloseButton>

        <AnimatePresence mode="wait">
          {selectedTopic ? (
            <TopicContent
              key="topic"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h2>{selectedTopic.title}</h2>
              
              <TagList>
                {selectedTopic.tags.map(tag => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </TagList>

              <div className="content">
                {selectedTopic.content}
              </div>

              <RelatedTopics>
                <h4>Related Topics</h4>
                <ul>
                  {selectedTopic.relatedTopics.map(topicId => {
                    const topic = topics.find(t => t.id === topicId);
                    if (!topic) return null;
                    return (
                      <li key={topicId} onClick={() => handleTopicSelect(topic)}>
                        {topic.title}
                      </li>
                    );
                  })}
                </ul>
              </RelatedTopics>
            </TopicContent>
          ) : (
            <TopicList>
              {filteredTopics.map(topic => (
                <TopicCard
                  key={topic.id}
                  onClick={() => handleTopicSelect(topic)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <h3>{topic.title}</h3>
                  <p>{topic.content.substring(0, 100)}...</p>
                </TopicCard>
              ))}
            </TopicList>
          )}
        </AnimatePresence>
      </Content>
    </HelpContainer>
  );
};

export default HelpSystem;