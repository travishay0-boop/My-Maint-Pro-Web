import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authenticatedApiRequest } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { 
  MessageCircle, 
  Bug, 
  Lightbulb, 
  ThumbsUp, 
  Send,
  X,
  Smile,
  Meh,
  Frown
} from 'lucide-react';

type FeedbackType = 'bug' | 'suggestion' | 'praise';
type SentimentRating = 'positive' | 'neutral' | 'negative';

interface FeedbackData {
  type: FeedbackType;
  message: string;
  sentiment?: SentimentRating;
  pageUrl: string;
  userAgent: string;
}

export default function FeedbackWidget() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('suggestion');
  const [message, setMessage] = useState('');
  const [sentiment, setSentiment] = useState<SentimentRating | undefined>();

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: FeedbackData) => {
      const response = await authenticatedApiRequest('POST', '/api/feedback', data);
      if (!response.ok) throw new Error('Failed to submit feedback');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Thank you!',
        description: 'Your feedback has been submitted successfully.',
      });
      setMessage('');
      setSentiment(undefined);
      setFeedbackType('suggestion');
      setIsOpen(false);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (!message.trim()) {
      toast({
        title: 'Please enter feedback',
        description: 'Your message cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    submitFeedbackMutation.mutate({
      type: feedbackType,
      message: message.trim(),
      sentiment,
      pageUrl: window.location.href,
      userAgent: navigator.userAgent,
    });
  };

  const feedbackTypes = [
    { value: 'bug', label: 'Report Issue', icon: Bug, color: 'text-red-500' },
    { value: 'suggestion', label: 'Suggestion', icon: Lightbulb, color: 'text-amber-500' },
    { value: 'praise', label: 'Compliment', icon: ThumbsUp, color: 'text-green-500' },
  ];

  const sentimentOptions = [
    { value: 'positive', icon: Smile, color: 'text-green-500', bgColor: 'bg-green-50 hover:bg-green-100', activeColor: 'bg-green-200 ring-2 ring-green-500' },
    { value: 'neutral', icon: Meh, color: 'text-amber-500', bgColor: 'bg-amber-50 hover:bg-amber-100', activeColor: 'bg-amber-200 ring-2 ring-amber-500' },
    { value: 'negative', icon: Frown, color: 'text-red-500', bgColor: 'bg-red-50 hover:bg-red-100', activeColor: 'bg-red-200 ring-2 ring-red-500' },
  ];

  if (!user) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90"
          size="icon"
          data-testid="button-feedback-widget"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md" data-testid="sheet-feedback">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Share Your Feedback
          </SheetTitle>
          <SheetDescription>
            Help us improve My Maintenance Pro. Your feedback is valuable!
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Feedback Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">What type of feedback?</Label>
            <RadioGroup
              value={feedbackType}
              onValueChange={(value) => setFeedbackType(value as FeedbackType)}
              className="grid grid-cols-3 gap-2"
            >
              {feedbackTypes.map((type) => (
                <div key={type.value}>
                  <RadioGroupItem
                    value={type.value}
                    id={type.value}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={type.value}
                    className={`flex flex-col items-center justify-center rounded-lg border-2 p-3 cursor-pointer transition-all
                      ${feedbackType === type.value 
                        ? 'border-primary bg-primary/5' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    data-testid={`button-feedback-type-${type.value}`}
                  >
                    <type.icon className={`w-5 h-5 mb-1 ${type.color}`} />
                    <span className="text-xs font-medium">{type.label}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Message Input */}
          <div className="space-y-2">
            <Label htmlFor="feedback-message" className="text-sm font-medium">
              {feedbackType === 'bug' 
                ? 'Describe the issue you encountered'
                : feedbackType === 'suggestion'
                ? 'Share your idea or suggestion'
                : 'What do you love about the app?'
              }
            </Label>
            <Textarea
              id="feedback-message"
              placeholder={
                feedbackType === 'bug'
                  ? 'Please describe what happened and what you expected...'
                  : feedbackType === 'suggestion'
                  ? 'How can we make the app better for you?'
                  : 'Tell us what you appreciate about the app...'
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px] resize-none"
              data-testid="textarea-feedback-message"
            />
          </div>

          {/* Sentiment Rating */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">How are you feeling? (optional)</Label>
            <div className="flex justify-center gap-4">
              {sentimentOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSentiment(sentiment === option.value ? undefined : option.value as SentimentRating)}
                  className={`p-3 rounded-full transition-all ${
                    sentiment === option.value 
                      ? option.activeColor 
                      : option.bgColor
                  }`}
                  data-testid={`button-sentiment-${option.value}`}
                >
                  <option.icon className={`w-8 h-8 ${option.color}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Context Info */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
            <p className="font-medium mb-1">Context included automatically:</p>
            <p>• Current page: {window.location.pathname}</p>
            <p>• Your account: {user.email}</p>
          </div>
        </div>

        <SheetFooter className="gap-2">
          <SheetClose asChild>
            <Button variant="outline" className="flex-1" data-testid="button-cancel-feedback">
              Cancel
            </Button>
          </SheetClose>
          <Button 
            onClick={handleSubmit} 
            className="flex-1"
            disabled={submitFeedbackMutation.isPending || !message.trim()}
            data-testid="button-submit-feedback"
          >
            {submitFeedbackMutation.isPending ? (
              'Sending...'
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Feedback
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
